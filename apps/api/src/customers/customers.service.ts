import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EmptyMovementType, InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";

@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.customer.findMany({
      orderBy: { name: "asc" }
    });
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: dto
    });
  }

  async getBalance(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) throw new NotFoundException("Customer not found");

    const [invoiceTotal, paymentTotal, emptyMovements] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          customerId,
          status: { not: InvoiceStatus.CANCELLED }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.payment.aggregate({
        where: { customerId },
        _sum: { amount: true }
      }),
      this.prisma.emptyContainerMovement.findMany({
        where: { customerId },
        select: { movementType: true, quantity: true }
      })
    ]);

    const emptyBalance = emptyMovements.reduce((sum, movement) => {
      if (movement.movementType === EmptyMovementType.RETURNED_BY_CUSTOMER) {
        return sum - movement.quantity;
      }
      return sum + movement.quantity;
    }, 0);

    return {
      customer,
      outstanding:
        Number(invoiceTotal._sum.totalAmount ?? 0) - Number(paymentTotal._sum.amount ?? 0),
      emptyBalance
    };
  }

  async getAccountHistory(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          customerId,
          status: { not: InvoiceStatus.CANCELLED }
        },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          paymentStatus: true,
          createdAt: true
        }
      }),
      this.prisma.payment.findMany({
        where: { customerId },
        select: {
          id: true,
          invoiceId: true,
          method: true,
          amount: true,
          reference: true,
          receivedAt: true
        }
      })
    ]);

    const entries = [
      ...invoices.map((invoice) => ({
        id: invoice.id,
        type: "INVOICE",
        reference: invoice.invoiceNumber,
        debit: Number(invoice.totalAmount),
        credit: 0,
        status: invoice.paymentStatus,
        occurredAt: invoice.createdAt
      })),
      ...payments.map((payment) => ({
        id: payment.id,
        type: "PAYMENT",
        reference: payment.reference ?? payment.method,
        debit: 0,
        credit: Number(payment.amount),
        status: payment.method,
        occurredAt: payment.receivedAt
      }))
    ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());

    let runningBalance = 0;
    return {
      customer,
      entries: entries.map((entry) => {
        runningBalance += entry.debit - entry.credit;
        return { ...entry, runningBalance };
      })
    };
  }

  async getDebtAging() {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { not: InvoiceStatus.CANCELLED },
        paymentStatus: { not: "PAID" }
      },
      include: {
        customer: true,
        payments: true
      },
      orderBy: { createdAt: "asc" }
    });

    const now = Date.now();
    return invoices
      .map((invoice) => {
        const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        const outstanding = Number(invoice.totalAmount) - paid;
        const ageDays = Math.floor((now - invoice.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customer: invoice.customer,
          invoiceDate: invoice.createdAt,
          ageDays,
          outstanding,
          bucket: this.agingBucket(ageDays)
        };
      })
      .filter((entry) => entry.outstanding > 0);
  }

  private agingBucket(ageDays: number) {
    if (ageDays <= 30) return "0_30";
    if (ageDays <= 60) return "31_60";
    if (ageDays <= 90) return "61_90";
    return "90_PLUS";
  }
}
