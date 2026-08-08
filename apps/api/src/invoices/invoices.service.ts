import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
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

  list() {
    return this.prisma.invoice.findMany({
      include: { customer: true, items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async get(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } }, payments: true }
    });

    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async create(dto: CreateInvoiceDto, createdById: string, actorRole: string) {
    if ((dto.initialPaymentMethod === PaymentMethod.BANK || dto.initialPaymentMethod === PaymentMethod.MOBILE_MONEY) && !dto.paymentReference) {
      throw new BadRequestException("Payment reference is required for bank and mobile money payments");
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException("Customer not found");

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((item) => item.productId) } }
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
      creditAmount: totalAmount - initialPaymentAmount,
      creditLimit: Number(customer.creditLimit),
      allowCreditLimitOverride: dto.allowCreditLimitOverride,
      actorRole
    });

    const paymentStatus =
      initialPaymentAmount === 0 ? PaymentStatus.UNPAID : initialPaymentAmount === totalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    const warehouseId = dto.warehouseId ?? mainWarehouseId;
    const invoiceNumber = await this.nextInvoiceNumber();

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true }
      });
      if (!warehouse) throw new NotFoundException("Warehouse not found");

      for (const item of invoiceItems) {
        await this.assertStockCanApply({
          productId: item.productId,
          warehouseId,
          quantity: item.quantity,
          allowNegativeStock: dto.allowNegativeStock,
          actorRole,
          tx
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          customerId: dto.customerId,
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

      return invoice;
    });
  }

  private async nextInvoiceNumber() {
    const count = await this.prisma.invoice.count();
    return `INV-${String(count + 1).padStart(6, "0")}`;
  }

  private async assertCreditLimitCanApply(input: {
    customerId: string;
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
          status: { not: InvoiceStatus.CANCELLED }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.payment.aggregate({
        where: { customerId: input.customerId },
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
    warehouseId: string;
    quantity: number;
    allowNegativeStock?: boolean;
    actorRole: string;
    tx: InvoiceTransaction;
  }) {
    const currentStock = await this.getProductWarehouseBalance(input.productId, input.warehouseId, input.tx);
    if (currentStock - input.quantity >= 0) return;

    if (input.allowNegativeStock && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) {
      return;
    }

    if (input.allowNegativeStock) {
      throw new ForbiddenException("Only owner or admin can allow invoice stock to go negative");
    }

    throw new BadRequestException("Invoice would make inventory negative");
  }

  private async getProductWarehouseBalance(productId: string, warehouseId: string, tx: InvoiceTransaction) {
    const movements = await tx.stockMovement.findMany({
      where: { productId, warehouseId },
      select: { movementType: true, quantity: true }
    });

    return movements.reduce((sum, movement) => {
      if (inboundMovementTypes.has(movement.movementType)) return sum + movement.quantity;
      if (movement.movementType === StockMovementType.COUNT_ADJUSTMENT) return sum + movement.quantity;
      return sum - movement.quantity;
    }, 0);
  }
}
