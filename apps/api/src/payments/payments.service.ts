import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(actorUserId: string, actorRole: string, companyId: string, query?: PaginationQuery) {
    return this.prisma.payment.findMany({
      where: actorRole === "SALESPERSON" ? { companyId, receivedById: actorUserId } : { companyId },
      include: { customer: true, invoice: true },
      orderBy: { receivedAt: "desc" },
      ...paginationArgs(query)
    });
  }

  async create(dto: CreatePaymentDto, receivedById: string, companyId: string) {
    if ((dto.method === PaymentMethod.BANK || dto.method === PaymentMethod.MOBILE_MONEY) && !dto.reference) {
      throw new BadRequestException("Payment reference is required for bank and mobile money payments");
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId, companyId } });
      if (!customer) throw new NotFoundException("Customer not found");

      if (dto.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: dto.invoiceId, companyId },
          include: { payments: true }
        });
        if (!invoice) throw new NotFoundException("Invoice not found");
        if (invoice.customerId !== dto.customerId) {
          throw new BadRequestException("Invoice does not belong to customer");
        }
        const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        if (paid + dto.amount > Number(invoice.totalAmount)) {
          throw new BadRequestException("Payment exceeds invoice balance");
        }
      }

      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          companyId,
          invoiceId: dto.invoiceId,
          method: dto.method,
          amount: dto.amount,
          reference: dto.reference,
          receivedById
        },
        include: { customer: true, invoice: { include: { payments: true } } }
      });

      if (dto.invoiceId) {
        await this.refreshInvoicePaymentStatus(dto.invoiceId, companyId, tx);
      }

      await tx.auditLog.create({
        data: {
          userId: receivedById,
          companyId,
          action: "CREATE",
          entity: "Payment",
          entityId: payment.id,
          metadata: {
            customerId: dto.customerId,
            invoiceId: dto.invoiceId,
            method: dto.method,
            amount: dto.amount,
            reference: dto.reference
          }
        }
      });

      return tx.payment.findUnique({
        where: { id: payment.id, companyId },
        include: { customer: true, invoice: { include: { payments: true } } }
      });
    });
  }

  async delete(paymentId: string, actorUserId: string, companyId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId, companyId },
      include: { customer: true }
    });
    if (!payment) throw new NotFoundException("Payment not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: { id: paymentId, companyId }
      });

      if (payment.invoiceId) {
        await this.refreshInvoicePaymentStatus(payment.invoiceId, companyId, tx);
      }

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "PAYMENT_DELETED",
          entity: "Payment",
          entityId: payment.id,
          metadata: {
            customerId: payment.customerId,
            customerName: payment.customer.name,
            invoiceId: payment.invoiceId,
            method: payment.method,
            amount: Number(payment.amount),
            reference: payment.reference
          }
        }
      });
    });

    return {
      id: payment.id,
      deletedById: actorUserId
    };
  }

  private async refreshInvoicePaymentStatus(invoiceId: string, companyId: string, tx: Prisma.TransactionClient) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId, companyId },
      include: { payments: true }
    });
    if (!invoice) return;

    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const total = Number(invoice.totalAmount);
    const paymentStatus = paid <= 0 ? PaymentStatus.UNPAID : paid >= total ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

    await tx.invoice.update({
      where: { id: invoiceId, companyId },
      data: { paymentStatus }
    });
  }
}
