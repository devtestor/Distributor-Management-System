import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.payment.findMany({
      include: { customer: true, invoice: true },
      orderBy: { receivedAt: "desc" }
    });
  }

  async create(dto: CreatePaymentDto, receivedById: string) {
    if ((dto.method === PaymentMethod.BANK || dto.method === PaymentMethod.MOBILE_MONEY) && !dto.reference) {
      throw new BadRequestException("Payment reference is required for bank and mobile money payments");
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException("Customer not found");

    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: dto.invoiceId },
        include: { payments: true }
      });
      if (!invoice) throw new NotFoundException("Invoice not found");
      if (invoice.customerId !== dto.customerId) {
        throw new BadRequestException("Invoice does not belong to customer");
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        method: dto.method,
        amount: dto.amount,
        reference: dto.reference,
        receivedById
      },
      include: { customer: true, invoice: { include: { payments: true } } }
    });

    if (dto.invoiceId) {
      await this.refreshInvoicePaymentStatus(dto.invoiceId);
    }

    return payment;
  }

  private async refreshInvoicePaymentStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });
    if (!invoice) return;

    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const total = Number(invoice.totalAmount);
    const paymentStatus = paid <= 0 ? PaymentStatus.UNPAID : paid >= total ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paymentStatus }
    });
  }
}
