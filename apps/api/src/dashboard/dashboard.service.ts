import { Injectable } from "@nestjs/common";
import { DeliveryStatus, EmptyMovementType, InvoiceStatus, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const inboundStock = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerDashboard() {
    const [products, invoices, payments, customers, emptyMovements, activeDeliveries] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        include: {
          stockMovements: {
            select: { movementType: true, quantity: true }
          }
        }
      }),
      this.prisma.invoice.aggregate({
        where: { status: { not: InvoiceStatus.CANCELLED } },
        _sum: { totalAmount: true }
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true }
      }),
      this.prisma.customer.count({
        where: { isActive: true }
      }),
      this.prisma.emptyContainerMovement.findMany({
        select: { movementType: true, quantity: true }
      }),
      this.prisma.deliveryTrip.count({
        where: {
          status: {
            in: [DeliveryStatus.LOADING, DeliveryStatus.ON_ROUTE, DeliveryStatus.RECONCILIATION]
          }
        }
      })
    ]);

    const stock = products.map((product) => {
      const quantity = product.stockMovements.reduce((sum, movement) => {
        return sum + this.signedStock(movement.movementType, movement.quantity);
      }, 0);
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        quantity,
        reorderLevel: product.reorderLevel,
        stockValue: quantity * Number(product.unitCost),
        needsReorder: quantity < product.reorderLevel
      };
    });

    const emptyContainerExposure = emptyMovements.reduce((sum, movement) => {
      if (movement.movementType === EmptyMovementType.RETURNED_BY_CUSTOMER) {
        return sum - movement.quantity;
      }
      return sum + movement.quantity;
    }, 0);

    const totalSales = Number(invoices._sum.totalAmount ?? 0);
    const totalPayments = Number(payments._sum.amount ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        stockValue: stock.reduce((sum, item) => sum + item.stockValue, 0),
        sales: totalSales,
        payments: totalPayments,
        creditExposure: totalSales - totalPayments,
        activeCustomers: customers,
        emptyContainerExposure,
        activeDeliveries,
        lowStockProducts: stock.filter((item) => item.needsReorder).length
      },
      lowStock: stock.filter((item) => item.needsReorder)
    };
  }

  private signedStock(movementType: StockMovementType, quantity: number) {
    if (inboundStock.has(movementType)) return quantity;
    if (movementType === StockMovementType.COUNT_ADJUSTMENT) return quantity;
    return -quantity;
  }
}
