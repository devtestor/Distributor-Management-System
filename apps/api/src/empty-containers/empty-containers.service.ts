import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EmptyMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateEmptyContainerMovementDto } from "./dto/create-empty-container-movement.dto";

@Injectable()
export class EmptyContainersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listMovements(companyId: string, query?: PaginationQuery) {
    return this.prisma.emptyContainerMovement.findMany({
      where: { companyId },
      include: {
        customer: true,
        product: true,
        createdBy: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(query, 100, 500)
    });
  }

  async customerLedger(customerId: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found");

    const movements = await this.prisma.emptyContainerMovement.findMany({
      where: { customerId, companyId },
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

  async createMovement(dto: CreateEmptyContainerMovementDto, createdById: string, companyId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found");

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId, companyId } });
      if (!product) throw new BadRequestException("Product not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.emptyContainerMovement.create({
        data: {
          ...dto,
          companyId,
          createdById
        },
        include: { customer: true, product: true, createdBy: { include: { role: true } } }
      });

      await tx.auditLog.create({
        data: {
          userId: createdById,
          companyId,
          action: "EMPTY_CONTAINER_MOVEMENT_RECORDED",
          entity: "EmptyContainerMovement",
          entityId: movement.id,
          metadata: {
            customerId: dto.customerId,
            productId: dto.productId,
            movementType: dto.movementType,
            quantity: dto.quantity,
            referenceType: dto.referenceType,
            referenceId: dto.referenceId
          }
        }
      });

      return movement;
    });
  }
}
