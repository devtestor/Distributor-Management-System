import { BadRequestException, Injectable } from "@nestjs/common";
import { StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StockMovementDto } from "./dto/stock-movement.dto";

const inboundMovementTypes = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

type RecordMovementInput = StockMovementDto & {
  createdById: string;
};

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getWarehouseStock(warehouseId: string) {
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
    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId);
    const signedQuantity = this.signedQuantity(input.movementType, input.quantity);

    if (currentStock + signedQuantity < 0) {
      throw new BadRequestException("Stock movement would make inventory negative");
    }

    return this.prisma.stockMovement.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: input.movementType,
        quantity: input.quantity,
        note: input.note,
        createdById: input.createdById
      }
    });
  }

  private async getProductWarehouseBalance(productId: string, warehouseId: string) {
    const movements = await this.prisma.stockMovement.findMany({
      where: { productId, warehouseId },
      select: { movementType: true, quantity: true }
    });

    return movements.reduce((sum, movement) => {
      return sum + this.signedQuantity(movement.movementType, movement.quantity);
    }, 0);
  }

  private signedQuantity(movementType: StockMovementType, quantity: number) {
    if (inboundMovementTypes.has(movementType)) return quantity;
    if (movementType === StockMovementType.COUNT_ADJUSTMENT) return quantity;
    return -quantity;
  }
}
