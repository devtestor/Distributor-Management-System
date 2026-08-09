import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

const mainWarehouseId = "00000000-0000-0000-0000-000000000001";
const inboundMovementTypes = new Set<StockMovementType>([
  StockMovementType.PURCHASE_RECEIPT,
  StockMovementType.TRUCK_RETURN,
  StockMovementType.TRANSFER_IN
]);

type InvoiceTransaction = Prisma.TransactionClient;

@Injectable()
export class InvoicesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(companyId: string, query?: PaginationQuery) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      include: { customer: true, items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(query)
    });
  }

  async get(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id, companyId },
      include: { customer: true, items: { include: { product: true } }, payments: true }
    });

    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async create(dto: CreateInvoiceDto, createdById: string, actorRole: string, companyId: string) {
    if ((dto.initialPaymentMethod === PaymentMethod.BANK || dto.initialPaymentMethod === PaymentMethod.MOBILE_MONEY) && !dto.paymentReference) {
      throw new BadRequestException("Payment reference is required for bank and mobile money payments");
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found");

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((item) => item.productId) }, companyId }
    });
    const productById = new Map(products.map((product) => [product.id, product]));

    if (products.length !== dto.items.length) {
      throw new BadRequestException("One or more products were not found");
    }

    const invoiceItems = dto.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new BadRequestException("Product not found");
      if (!product.isActive) throw new BadRequestException(`${product.name} is inactive and cannot be sold`);
      const discount = item.discountAmount ?? 0;
      const lineTotal = Number(product.unitPrice) * item.quantity - discount;
      if (lineTotal < 0) throw new BadRequestException("Discount cannot exceed line total");
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.unitPrice,
        discountAmount: discount,
        lineTotal
      };
    });

    const totalAmount = invoiceItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const initialPaymentAmount = dto.initialPaymentAmount ?? 0;
    if (initialPaymentAmount > totalAmount) {
      throw new BadRequestException("Initial payment cannot exceed invoice total");
    }

    await this.assertCreditLimitCanApply({
      customerId: dto.customerId,
      companyId,
      creditAmount: totalAmount - initialPaymentAmount,
      creditLimit: Number(customer.creditLimit),
      allowCreditLimitOverride: dto.allowCreditLimitOverride,
      actorRole
    });

    const paymentStatus =
      initialPaymentAmount === 0 ? PaymentStatus.UNPAID : initialPaymentAmount === totalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    return this.prisma.$transaction(async (tx) => {
      const warehouseId = dto.warehouseId ?? mainWarehouseId;
      const warehouse = await tx.warehouse.findUnique({
        where: { id: warehouseId, companyId },
        select: { id: true }
      });
      if (!warehouse) throw new NotFoundException("Warehouse not found");

      for (const item of invoiceItems) {
        await this.assertStockCanApply({
          productId: item.productId,
          companyId,
          warehouseId,
          quantity: item.quantity,
          allowNegativeStock: dto.allowNegativeStock,
          actorRole,
          tx
        });
      }

      const invoiceNumber = await this.nextInvoiceNumber(tx, companyId);

      const invoice = await tx.invoice.create({
        data: {
          customerId: dto.customerId,
          companyId,
          invoiceNumber,
          status: InvoiceStatus.ISSUED,
          paymentStatus,
          totalAmount,
          createdById,
          items: { create: invoiceItems },
          payments:
            initialPaymentAmount > 0 && dto.initialPaymentMethod
              ? {
                  create: {
                    customerId: dto.customerId,
                    companyId,
                    method: dto.initialPaymentMethod,
                    amount: initialPaymentAmount,
                    reference: dto.paymentReference,
                    receivedById: createdById
                  }
                }
              : undefined
        },
        include: { customer: true, items: { include: { product: true } }, payments: true }
      });

      await tx.stockMovement.createMany({
        data: invoiceItems.map((item) => ({
          productId: item.productId,
          companyId,
          warehouseId,
          movementType: StockMovementType.SALE_ISSUE,
          quantity: item.quantity,
          unitCost: productById.get(item.productId)?.unitCost,
          referenceType: "INVOICE",
          referenceId: invoice.id,
          note: `Invoice ${invoice.invoiceNumber}`,
          createdById
        }))
      });

      await tx.auditLog.create({
        data: {
          userId: createdById,
          companyId,
          action: "CREATE",
          entity: "Invoice",
          entityId: invoice.id,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            customerId: dto.customerId,
            totalAmount,
            paymentStatus,
            itemCount: invoiceItems.length
          }
        }
      });

      return invoice;
    });
  }

  private async nextInvoiceNumber(tx: InvoiceTransaction, companyId: string) {
    const sequence = await tx.invoiceSequence.upsert({
      where: { companyId },
      update: { lastNumber: { increment: 1 } },
      create: { id: companyId, companyId, lastNumber: 1 },
      select: { lastNumber: true }
    });

    return `INV-${String(sequence.lastNumber).padStart(6, "0")}`;
  }

  private async assertCreditLimitCanApply(input: {
    customerId: string;
    companyId: string;
    creditAmount: number;
    creditLimit: number;
    allowCreditLimitOverride?: boolean;
    actorRole: string;
  }) {
    if (input.creditAmount <= 0) return;

    const [invoiceTotal, paymentTotal] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          customerId: input.customerId,
          companyId: input.companyId,
          status: { not: InvoiceStatus.CANCELLED }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.payment.aggregate({
        where: { customerId: input.customerId, companyId: input.companyId },
        _sum: { amount: true }
      })
    ]);

    const outstanding = Number(invoiceTotal._sum.totalAmount ?? 0) - Number(paymentTotal._sum.amount ?? 0);
    if (outstanding + input.creditAmount <= input.creditLimit) return;

    if (input.allowCreditLimitOverride && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) {
      return;
    }

    if (input.allowCreditLimitOverride) {
      throw new ForbiddenException("Only owner or admin can approve credit over the customer limit");
    }

    throw new BadRequestException("Invoice would exceed the customer credit limit");
  }

  private async assertStockCanApply(input: {
    productId: string;
    companyId: string;
    warehouseId: string;
    quantity: number;
    allowNegativeStock?: boolean;
    actorRole: string;
    tx: InvoiceTransaction;
  }) {
    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId, input.companyId, input.tx);
    if (currentStock - input.quantity >= 0) return;

    if (input.allowNegativeStock && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) {
      return;
    }

    if (input.allowNegativeStock) {
      throw new ForbiddenException("Only owner or admin can allow invoice stock to go negative");
    }

    throw new BadRequestException("Invoice would make inventory negative");
  }

  private async getProductWarehouseBalance(productId: string, warehouseId: string, companyId: string, tx: InvoiceTransaction) {
    const movements = await tx.stockMovement.findMany({
      where: { productId, warehouseId, companyId },
      select: { movementType: true, quantity: true }
    });

    return movements.reduce((sum, movement) => {
      if (inboundMovementTypes.has(movement.movementType)) return sum + movement.quantity;
      if (movement.movementType === StockMovementType.COUNT_ADJUSTMENT) return sum + movement.quantity;
      return sum - movement.quantity;
    }, 0);
  }
}
