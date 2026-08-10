import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { StockCountDto } from "./dto/stock-count.dto";
import { StockMovementDto } from "./dto/stock-movement.dto";
import { StockTransferDto } from "./dto/stock-transfer.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

const inboundMovementTypes = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

type RecordMovementInput = StockMovementDto & {
  companyId: string;
  createdById: string;
  actorRole: string;
};

type StockTransaction = Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listWarehouses(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: { name: "asc" }
    });
  }

  async createWarehouse(dto: CreateWarehouseDto, actorUserId: string, companyId: string) {
    const warehouse = await this.prisma.warehouse.create({
      data: {
        companyId,
        name: dto.name,
        location: dto.location
      }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "WAREHOUSE_CREATED",
        entity: "Warehouse",
        entityId: warehouse.id,
        metadata: {
          name: warehouse.name,
          location: warehouse.location
        }
      }
    });

    return warehouse;
  }

  async updateWarehouse(warehouseId: string, dto: UpdateWarehouseDto, actorUserId: string, companyId: string) {
    await this.assertWarehouseExists(warehouseId, companyId);

    const warehouse = await this.prisma.warehouse.update({
      where: { id: warehouseId, companyId },
      data: dto
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "WAREHOUSE_UPDATED",
        entity: "Warehouse",
        entityId: warehouse.id,
        metadata: {
          name: warehouse.name,
          location: warehouse.location,
          isActive: warehouse.isActive
        }
      }
    });

    return warehouse;
  }

  async deleteWarehouse(warehouseId: string, actorUserId: string, companyId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId, companyId },
      include: { _count: { select: { stockMovements: true } } }
    });
    if (!warehouse) throw new NotFoundException("Warehouse not found");
    if (warehouse._count.stockMovements > 0) {
      throw new BadRequestException("This warehouse has stock history. Deactivate it instead.");
    }

    await this.prisma.warehouse.delete({
      where: { id: warehouseId, companyId }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "WAREHOUSE_DELETED",
        entity: "Warehouse",
        entityId: warehouse.id,
        metadata: {
          name: warehouse.name,
          location: warehouse.location
        }
      }
    });

    return {
      id: warehouse.id,
      deletedById: actorUserId
    };
  }

  listMovements(companyId: string, query?: PaginationQuery) {
    return this.prisma.stockMovement.findMany({
      where: { companyId },
      include: {
        product: true,
        warehouse: true,
        createdBy: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(query, 100, 500)
    });
  }

  async getWarehouseStock(warehouseId: string, companyId: string) {
    await this.assertWarehouseExists(warehouseId, companyId);

    const products = await this.prisma.product.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: {
        stockMovements: {
          where: { warehouseId, companyId },
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
    await this.assertProductExists(input.productId, input.companyId);
    await this.assertWarehouseExists(input.warehouseId, input.companyId);

    const signedQuantity = this.signedQuantity(input.movementType, input.quantity);
    await this.assertMovementCanApply({
      productId: input.productId,
      companyId: input.companyId,
      warehouseId: input.warehouseId,
      signedQuantity,
      allowNegative: input.allowNegative,
      actorRole: input.actorRole
    });

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId, companyId: input.companyId },
      select: { unitCost: true }
    });

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          companyId: input.companyId,
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

      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          companyId: input.companyId,
          action: "STOCK_MOVEMENT_RECORDED",
          entity: "StockMovement",
          entityId: movement.id,
          metadata: {
            productId: input.productId,
            warehouseId: input.warehouseId,
            movementType: input.movementType,
            quantity: input.quantity,
            allowNegative: input.allowNegative ?? false
          }
        }
      });

      return movement;
    });
  }

  async transferStock(input: StockTransferDto & { companyId: string; createdById: string; actorRole: string }) {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException("Source and destination warehouses must be different");
    }

    await this.assertProductExists(input.productId, input.companyId);
    await Promise.all([
      this.assertWarehouseExists(input.fromWarehouseId, input.companyId),
      this.assertWarehouseExists(input.toWarehouseId, input.companyId)
    ]);

    const referenceId = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      await this.assertMovementCanApply({
        productId: input.productId,
        companyId: input.companyId,
        warehouseId: input.fromWarehouseId,
        signedQuantity: -input.quantity,
        allowNegative: input.allowNegative,
        actorRole: input.actorRole,
        tx
      });

      const product = await tx.product.findUnique({
        where: { id: input.productId, companyId: input.companyId },
        select: { unitCost: true }
      });

      const outbound = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          companyId: input.companyId,
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
          companyId: input.companyId,
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

      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          companyId: input.companyId,
          action: "STOCK_TRANSFER_RECORDED",
          entity: "StockMovement",
          entityId: referenceId,
          metadata: {
            productId: input.productId,
            fromWarehouseId: input.fromWarehouseId,
            toWarehouseId: input.toWarehouseId,
            quantity: input.quantity,
            allowNegative: input.allowNegative ?? false
          }
        }
      });

      return { referenceId, outbound, inbound };
    });
  }

  async recordStockCount(input: StockCountDto & { companyId: string; createdById: string }) {
    await this.assertProductExists(input.productId, input.companyId);
    await this.assertWarehouseExists(input.warehouseId, input.companyId);

    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId, input.companyId);
    const adjustmentQuantity = input.countedQuantity - currentStock;
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId, companyId: input.companyId },
      select: { unitCost: true }
    });

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          companyId: input.companyId,
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

      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          companyId: input.companyId,
          action: "STOCK_COUNT_RECORDED",
          entity: "StockMovement",
          entityId: movement.id,
          metadata: {
            productId: input.productId,
            warehouseId: input.warehouseId,
            previousQuantity: currentStock,
            countedQuantity: input.countedQuantity,
            adjustmentQuantity
          }
        }
      });

      return movement;
    });
  }

  private async getProductWarehouseBalance(productId: string, warehouseId: string, companyId: string, tx: StockTransaction = this.prisma) {
    const movements = await tx.stockMovement.findMany({
      where: { productId, warehouseId, companyId },
      select: { movementType: true, quantity: true }
    });

    return movements.reduce((sum, movement) => {
      return sum + this.signedQuantity(movement.movementType, movement.quantity);
    }, 0);
  }

  private async assertProductExists(productId: string, companyId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, companyId },
      select: { id: true }
    });
    if (!product) throw new NotFoundException("Product not found");
  }

  private async assertWarehouseExists(warehouseId: string, companyId: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId, companyId },
      select: { id: true }
    });
    if (!warehouse) throw new NotFoundException("Warehouse not found");
  }

  private async assertMovementCanApply(input: {
    productId: string;
    companyId: string;
    warehouseId: string;
    signedQuantity: number;
    allowNegative?: boolean;
    actorRole: string;
    tx?: StockTransaction;
  }) {
    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId, input.companyId, input.tx);
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
