import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DebtCollectionStatus, EmptyMovementType, InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateDebtCollectionActivityDto } from "./dto/create-debt-collection-activity.dto";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateDebtCollectionActivityDto } from "./dto/update-debt-collection-activity.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(companyId: string, query?: PaginationQuery) {
    const customers = await this.prisma.customer.findMany({
      where: { companyId },
      include: {
        invoices: {
          where: { status: { not: InvoiceStatus.CANCELLED } },
          select: { totalAmount: true }
        },
        payments: {
          select: { amount: true }
        },
        emptyContainerMovements: {
          select: { movementType: true, quantity: true }
        }
      },
      orderBy: { name: "asc" },
      ...paginationArgs(query)
    });

    return customers.map((customer) => {
      const invoiceTotal = customer.invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
      const paymentTotal = customer.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const emptyBalance = customer.emptyContainerMovements.reduce((sum, movement) => {
        if (movement.movementType === EmptyMovementType.RETURNED_BY_CUSTOMER) {
          return sum - movement.quantity;
        }
        return sum + movement.quantity;
      }, 0);

      return {
        id: customer.id,
        companyId: customer.companyId,
        name: customer.name,
        phone: customer.phone,
        route: customer.route,
        location: customer.location,
        creditLimit: customer.creditLimit,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        outstanding: invoiceTotal - paymentTotal,
        emptyBalance
      };
    });
  }

  async create(dto: CreateCustomerDto, actorUserId: string, companyId: string) {
    const customer = await this.prisma.customer.create({
      data: { ...dto, companyId }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "CUSTOMER_CREATED",
        entity: "Customer",
        entityId: customer.id,
        metadata: {
          name: customer.name,
          route: customer.route
        }
      }
    });

    return customer;
  }

  async update(customerId: string, dto: UpdateCustomerDto, actorUserId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, companyId }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const updated = await this.prisma.customer.update({
      where: { id: customerId, companyId },
      data: dto
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "CUSTOMER_UPDATED",
        entity: "Customer",
        entityId: updated.id,
        metadata: {
          name: updated.name,
          route: updated.route,
          isActive: updated.isActive
        }
      }
    });

    return updated;
  }

  async delete(customerId: string, actorUserId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, companyId },
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true,
            emptyContainerMovements: true
          }
        }
      }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const relatedRecords = customer._count.invoices + customer._count.payments + customer._count.emptyContainerMovements;
    if (relatedRecords > 0) {
      throw new BadRequestException("This customer has business history. Deactivate it instead.");
    }

    await this.prisma.customer.delete({
      where: { id: customerId, companyId }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "CUSTOMER_DELETED",
        entity: "Customer",
        entityId: customer.id,
        metadata: {
          name: customer.name,
          route: customer.route
        }
      }
    });

    return {
      id: customer.id,
      deletedById: actorUserId
    };
  }

  async getBalance(customerId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, companyId }
    });

    if (!customer) throw new NotFoundException("Customer not found");

    const [invoiceTotal, paymentTotal, emptyMovements] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          customerId,
          companyId,
          status: { not: InvoiceStatus.CANCELLED }
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.payment.aggregate({
        where: { customerId, companyId },
        _sum: { amount: true }
      }),
      this.prisma.emptyContainerMovement.findMany({
        where: { customerId, companyId },
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

  async getAccountHistory(customerId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, companyId }
    });
    if (!customer) throw new NotFoundException("Customer not found");

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          customerId,
          companyId,
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
        where: { customerId, companyId },
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

  async getDebtAging(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
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

  listDebtCollectionActivities(companyId: string) {
    return this.prisma.debtCollectionActivity.findMany({
      where: { companyId },
      include: {
        customer: true,
        invoice: true,
        createdBy: { include: { role: true } }
      },
      orderBy: [{ status: "asc" }, { nextFollowUpAt: "asc" }, { createdAt: "desc" }]
    });
  }

  async createDebtCollectionActivity(dto: CreateDebtCollectionActivityDto, actorUserId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found");

    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId, companyId } });
      if (!invoice) throw new NotFoundException("Invoice not found");
      if (invoice.customerId !== dto.customerId) throw new BadRequestException("Invoice does not belong to customer");
    }

    const activity = await this.prisma.debtCollectionActivity.create({
      data: {
        companyId,
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        actionType: dto.actionType,
        status: dto.status ?? DebtCollectionStatus.OPEN,
        note: dto.note,
        promisedAmount: dto.promisedAmount,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : undefined,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
        createdById: actorUserId,
        completedAt: dto.status === DebtCollectionStatus.COMPLETED ? new Date() : undefined
      },
      include: { customer: true, invoice: true, createdBy: { include: { role: true } } }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "DEBT_COLLECTION_ACTIVITY_CREATED",
        entity: "DebtCollectionActivity",
        entityId: activity.id,
        metadata: {
          customerId: activity.customerId,
          invoiceId: activity.invoiceId,
          actionType: activity.actionType,
          status: activity.status,
          promisedAmount: activity.promisedAmount ? Number(activity.promisedAmount) : null
        }
      }
    });

    return activity;
  }

  async updateDebtCollectionActivity(id: string, dto: UpdateDebtCollectionActivityDto, actorUserId: string, companyId: string) {
    const activity = await this.prisma.debtCollectionActivity.findUnique({ where: { id, companyId } });
    if (!activity) throw new NotFoundException("Collection activity not found");

    const updated = await this.prisma.debtCollectionActivity.update({
      where: { id, companyId },
      data: {
        status: dto.status,
        note: dto.note ?? activity.note,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : activity.nextFollowUpAt,
        completedAt: dto.status === DebtCollectionStatus.COMPLETED ? new Date() : activity.completedAt
      },
      include: { customer: true, invoice: true, createdBy: { include: { role: true } } }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "DEBT_COLLECTION_ACTIVITY_UPDATED",
        entity: "DebtCollectionActivity",
        entityId: activity.id,
        metadata: {
          status: updated.status,
          customerId: updated.customerId,
          invoiceId: updated.invoiceId
        }
      }
    });

    return updated;
  }

  private agingBucket(ageDays: number) {
    if (ageDays <= 30) return "0_30";
    if (ageDays <= 60) return "31_60";
    if (ageDays <= 90) return "61_90";
    return "90_PLUS";
  }
}
