import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StockCountDto } from "./dto/stock-count.dto";
import { StockMovementDto } from "./dto/stock-movement.dto";
import { StockTransferDto } from "./dto/stock-transfer.dto";

const inboundMovementTypes = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

type RecordMovementInput = StockMovementDto & {
  createdById: string;
  actorRole: string;
};

type StockTransaction = Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listWarehouses() {
    return this.prisma.warehouse.findMany({
      orderBy: { name: "asc" }
    });
  }

  listMovements() {
    return this.prisma.stockMovement.findMany({
      include: {
        product: true,
        warehouse: true,
        createdBy: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async getWarehouseStock(warehouseId: string) {
    await this.assertWarehouseExists(warehouseId);

    const products = await this.prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        stockMovements: {
          where: { warehouseId },
          select: { movementType: true, quantity: true }
        }
      }
    });

    return products.map((product) => {
      const balance = product.stockMovements.reduce((sum, movement) => {
        return sum + this.signedQuantity(movement.movementType, movement.quantity);
      }, 0);

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        unitSize: product.unitSize,
        reorderLevel: product.reorderLevel,
        unitCost: product.unitCost,
        unitPrice: product.unitPrice,
        quantity: balance,
        needsReorder: balance < product.reorderLevel
      };
    });
  }

  async recordMovement(input: RecordMovementInput) {
    await this.assertProductExists(input.productId);
    await this.assertWarehouseExists(input.warehouseId);

    const signedQuantity = this.signedQuantity(input.movementType, input.quantity);
    await this.assertMovementCanApply({
      productId: input.productId,
      warehouseId: input.warehouseId,
      signedQuantity,
      allowNegative: input.allowNegative,
      actorRole: input.actorRole
    });

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { unitCost: true }
    });

    return this.prisma.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: input.movementType,
        quantity: input.quantity,
        unitCost: product?.unitCost,
        note: input.note,
        createdById: input.createdById
      },
      include: {
        product: true,
        warehouse: true,
        createdBy: {
          include: { role: true }
        }
      }
    });
  }

  async transferStock(input: StockTransferDto & { createdById: string; actorRole: string }) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException("Source and destination warehouses must be different");
    }

    await this.assertProductExists(input.productId);
    await Promise.all([this.assertWarehouseExists(input.fromWarehouseId), this.assertWarehouseExists(input.toWarehouseId)]);

    const referenceId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      await this.assertMovementCanApply({
        productId: input.productId,
        warehouseId: input.fromWarehouseId,
        signedQuantity: -input.quantity,
        allowNegative: input.allowNegative,
        actorRole: input.actorRole,
        tx
      });

      const product = await tx.product.findUnique({
        where: { id: input.productId },
        select: { unitCost: true }
      });

      const outbound = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.fromWarehouseId,
          movementType: StockMovementType.TRANSFER_OUT,
          quantity: input.quantity,
          unitCost: product?.unitCost,
          referenceType: "WAREHOUSE_TRANSFER",
          referenceId,
          note: input.note,
          createdById: input.createdById
        }
      });

      const inbound = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          warehouseId: input.toWarehouseId,
          movementType: StockMovementType.TRANSFER_IN,
          quantity: input.quantity,
          unitCost: product?.unitCost,
          referenceType: "WAREHOUSE_TRANSFER",
          referenceId,
          note: input.note,
          createdById: input.createdById
        }
      });

      return { referenceId, outbound, inbound };
    });
  }

  async recordStockCount(input: StockCountDto & { createdById: string }) {
    await this.assertProductExists(input.productId);
    await this.assertWarehouseExists(input.warehouseId);

    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId);
    const adjustmentQuantity = input.countedQuantity - currentStock;
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { unitCost: true }
    });

    return this.prisma.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: StockMovementType.COUNT_ADJUSTMENT,
        quantity: adjustmentQuantity,
        unitCost: product?.unitCost,
        referenceType: "PHYSICAL_STOCK_COUNT",
        note: input.note ?? `Physical count set stock to ${input.countedQuantity}`,
        createdById: input.createdById
      },
      include: {
        product: true,
        warehouse: true,
        createdBy: {
          include: { role: true }
        }
      }
    });
  }

  private async getProductWarehouseBalance(productId: string, warehouseId: string, tx: StockTransaction = this.prisma) {
    const movements = await tx.stockMovement.findMany({
      where: { productId, warehouseId },
      select: { movementType: true, quantity: true }
    });

    return movements.reduce((sum, movement) => {
      return sum + this.signedQuantity(movement.movementType, movement.quantity);
    }, 0);
  }

  private async assertProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    });
    if (!product) throw new NotFoundException("Product not found");
  }

  private async assertWarehouseExists(warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true }
    });
    if (!warehouse) throw new NotFoundException("Warehouse not found");
  }

  private async assertMovementCanApply(input: {
    productId: string;
    warehouseId: string;
    signedQuantity: number;
    allowNegative?: boolean;
    actorRole: string;
    tx?: StockTransaction;
  }) {
    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId, input.tx);
    if (currentStock + input.signedQuantity >= 0) return;

    if (input.allowNegative && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) {
      return;
    }

    if (input.allowNegative) {
      throw new ForbiddenException("Only owner or admin can allow negative stock");
    }

    throw new BadRequestException("Stock movement would make inventory negative");
  }

  private signedQuantity(movementType: StockMovementType, quantity: number) {
    if (inboundMovementTypes.has(movementType)) return quantity;
    if (movementType === StockMovementType.COUNT_ADJUSTMENT) return quantity;
    return -quantity;
  }
}
