import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateInvoiceDto, createdById: string) {
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

    const paymentStatus =
      initialPaymentAmount === 0 ? PaymentStatus.UNPAID : initialPaymentAmount === totalAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    return this.prisma.invoice.create({
      data: {
        customerId: dto.customerId,
        invoiceNumber: await this.nextInvoiceNumber(),
        status: "ISSUED",
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
  }

  private async nextInvoiceNumber() {
    const count = await this.prisma.invoice.count();
    return `INV-${String(count + 1).padStart(6, "0")}`;
  }
}
