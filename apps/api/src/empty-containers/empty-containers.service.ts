import { Injectable, NotFoundException } from "@nestjs/common";
import { EmptyMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEmptyContainerMovementDto } from "./dto/create-empty-container-movement.dto";

@Injectable()
export class EmptyContainersService {
  constructor(private readonly prisma: PrismaService) {}

  async customerLedger(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException("Customer not found");

    const movements = await this.prisma.emptyContainerMovement.findMany({
      where: { customerId },
      include: { product: true },
      orderBy: { createdAt: "desc" }
    });

    const balance = movements.reduce((sum, movement) => {
      if (movement.movementType === EmptyMovementType.RETURNED_BY_CUSTOMER) {
        return sum - movement.quantity;
      }
      return sum + movement.quantity;
    }, 0);

    return { customer, balance, movements };
  }

  createMovement(dto: CreateEmptyContainerMovementDto, createdById: string) {
    return this.prisma.emptyContainerMovement.create({
      data: {
        ...dto,
        createdById
      },
      include: { customer: true, product: true }
    });
  }
}
