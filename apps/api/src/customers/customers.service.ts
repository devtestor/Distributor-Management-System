import { Injectable, NotFoundException } from "@nestjs/common";
import { EmptyMovementType, InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
