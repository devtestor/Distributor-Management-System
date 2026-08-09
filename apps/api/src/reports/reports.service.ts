import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { EmptyMovementType, InvoiceStatus, PaymentStatus, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const inboundStock = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async sales(input: { companyId: string; from?: string; to?: string }) {
    const dateRange = this.dateRange(input.from, input.to);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId: input.companyId,
        status: { not: InvoiceStatus.CANCELLED },
        createdAt: dateRange
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true
      },
      orderBy: { createdAt: "desc" }
    });

    const productMap = new Map<
      string,
      { productId: string; sku: string; name: string; quantity: number; revenue: number; grossMargin: number }
    >();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const revenue = Number(item.lineTotal);
        const unitCost = Number(item.product.unitCost);
        const grossMargin = revenue - unitCost * item.quantity;
        const current = productMap.get(item.productId) ?? {
          productId: item.productId,
          sku: item.product.sku,
          name: item.product.name,
          quantity: 0,
          revenue: 0,
          grossMargin: 0
        };
        current.quantity += item.quantity;
        current.revenue += revenue;
        current.grossMargin += grossMargin;
        productMap.set(item.productId, current);
      }
    }

    const totalSales = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + invoice.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0),
      0
    );

    return {
      from: dateRange.gte?.toISOString() ?? null,
      to: dateRange.lte?.toISOString() ?? null,
      totals: {
        invoices: invoices.length,
        sales: totalSales,
        collected: totalPaid,
        credit: totalSales - totalPaid,
        grossMargin: [...productMap.values()].reduce((sum, product) => sum + product.grossMargin, 0)
      },
      products: [...productMap.values()].sort((a, b) => b.revenue - a.revenue),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer.name,
        totalAmount: Number(invoice.totalAmount),
        paidAmount: invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
        paymentStatus: invoice.paymentStatus,
        createdAt: invoice.createdAt
      }))
    };
  }

  async stock(companyId: string) {
    const products = await this.prisma.product.findMany({
      where: { companyId },
      include: {
        stockMovements: {
          where: { companyId },
          include: { warehouse: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const rows = products.map((product) => {
      const quantity = product.stockMovements.reduce((sum, movement) => {
        return sum + this.signedQuantity(movement.movementType, movement.quantity);
      }, 0);

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        quantity,
        unitCost: Number(product.unitCost),
        unitPrice: Number(product.unitPrice),
        stockValue: quantity * Number(product.unitCost),
        reorderLevel: product.reorderLevel,
        needsReorder: quantity < product.reorderLevel
      };
    });

    return {
      totals: {
        products: rows.length,
        stockValue: rows.reduce((sum, row) => sum + row.stockValue, 0),
        lowStock: rows.filter((row) => row.needsReorder).length
      },
      rows
    };
  }

  async debt(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        status: { not: InvoiceStatus.CANCELLED },
        paymentStatus: { not: PaymentStatus.PAID }
      },
      include: {
        customer: true,
        payments: true
      },
      orderBy: { createdAt: "asc" }
    });

    const rows = invoices
      .map((invoice) => {
        const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const outstanding = Number(invoice.totalAmount) - paid;
        const ageDays = Math.max(0, Math.floor((Date.now() - invoice.createdAt.getTime()) / 86_400_000));

        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customer.name,
          route: invoice.customer.route,
          totalAmount: Number(invoice.totalAmount),
          paidAmount: paid,
          outstanding,
          ageDays,
          bucket: this.ageBucket(ageDays),
          createdAt: invoice.createdAt
        };
      })
      .filter((row) => row.outstanding > 0);

    return {
      totals: {
        outstanding: rows.reduce((sum, row) => sum + row.outstanding, 0),
        invoices: rows.length,
        over90Days: rows.filter((row) => row.bucket === "90_PLUS").reduce((sum, row) => sum + row.outstanding, 0)
      },
      rows
    };
  }

  async empties(companyId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { companyId },
      include: {
        emptyContainerMovements: {
          where: { companyId },
          include: { product: true }
        }
      },
      orderBy: { name: "asc" }
    });

    const rows = customers
      .map((customer) => {
        const balance = customer.emptyContainerMovements.reduce((sum, movement) => {
          if (movement.movementType === EmptyMovementType.RETURNED_BY_CUSTOMER) return sum - movement.quantity;
          return sum + movement.quantity;
        }, 0);

        return {
          customerId: customer.id,
          customer: customer.name,
          route: customer.route,
          balance,
          movements: customer.emptyContainerMovements.length
        };
      })
      .filter((row) => row.balance !== 0);

    return {
      totals: {
        exposure: rows.reduce((sum, row) => sum + row.balance, 0),
        customers: rows.length
      },
      rows
    };
  }

  private dateRange(from?: string, to?: string) {
    const range: { gte?: Date; lte?: Date } = {};
    if (from) {
      range.gte = new Date(from);
      if (Number.isNaN(range.gte.getTime())) throw new BadRequestException("Invalid from date");
    }
    if (to) {
      range.lte = new Date(to);
      if (Number.isNaN(range.lte.getTime())) throw new BadRequestException("Invalid to date");
      range.lte.setHours(23, 59, 59, 999);
    }
    return range;
  }

  private signedQuantity(movementType: StockMovementType, quantity: number) {
    if (inboundStock.has(movementType)) return quantity;
    if (movementType === StockMovementType.COUNT_ADJUSTMENT) return quantity;
    return -quantity;
  }

  private ageBucket(ageDays: number) {
    if (ageDays <= 30) return "0_30";
    if (ageDays <= 60) return "31_60";
    if (ageDays <= 90) return "61_90";
    return "90_PLUS";
  }
}
