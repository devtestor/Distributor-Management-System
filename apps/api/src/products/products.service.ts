import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(companyId: string, query?: PaginationQuery) {
    return this.prisma.product.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      ...paginationArgs(query)
    });
  }

  async create(dto: CreateProductDto, actorUserId: string, companyId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            companyId,
            ...dto,
            unitCost: dto.unitCost,
            unitPrice: dto.unitPrice,
            tracksEmpties: dto.tracksEmpties ?? false,
            priceHistory: {
              create: {
                companyId,
                changedById: actorUserId,
                newCost: dto.unitCost,
                newPrice: dto.unitPrice,
                changeReason: "Initial product price"
              }
            }
          },
          include: {
            priceHistory: {
              orderBy: { createdAt: "desc" },
              take: 5
            }
          }
        });

        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            companyId,
            action: "PRODUCT_CREATED",
            entity: "Product",
            entityId: product.id,
            metadata: {
              sku: product.sku,
              name: product.name,
              unitPrice: dto.unitPrice
            }
          }
        });

        return product;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Product SKU already exists");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, actorUserId: string, companyId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, companyId }
    });
    if (!product) throw new NotFoundException("Product not found");

    const nextUnitCost = dto.unitCost ?? product.unitCost;
    const nextUnitPrice = dto.unitPrice ?? product.unitPrice;
    const priceChanged = Number(nextUnitCost) !== Number(product.unitCost) || Number(nextUnitPrice) !== Number(product.unitPrice);
    const { priceChangeReason, ...productData } = dto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id, companyId },
          data: productData,
          include: {
            priceHistory: {
              orderBy: { createdAt: "desc" },
              take: 5
            }
          }
        });

        if (priceChanged) {
          await tx.productPriceHistory.create({
            data: {
              productId: product.id,
              companyId,
              previousCost: product.unitCost,
              newCost: nextUnitCost,
              previousPrice: product.unitPrice,
              newPrice: nextUnitPrice,
              changedById: actorUserId,
              changeReason: priceChangeReason
            }
          });
        }

        await tx.auditLog.create({
          data: {
            userId: actorUserId,
            companyId,
            action: priceChanged ? "PRODUCT_PRICE_UPDATED" : "PRODUCT_UPDATED",
            entity: "Product",
            entityId: product.id,
            metadata: {
              sku: updated.sku,
              isActive: updated.isActive,
              priceChanged
            }
          }
        });

        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Product SKU already exists");
      }
      throw error;
    }
  }

  priceHistory(productId: string, companyId: string) {
    return this.prisma.productPriceHistory.findMany({
      where: { productId, companyId },
      include: {
        changedBy: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  async delete(id: string, actorUserId: string, companyId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            stockMovements: true,
            invoiceItems: true,
            emptyContainerMovements: true,
            deliveryTripItems: true
          }
        }
      }
    });
    if (!product) throw new NotFoundException("Product not found");

    const relatedRecords =
      product._count.stockMovements +
      product._count.invoiceItems +
      product._count.emptyContainerMovements +
      product._count.deliveryTripItems;
    if (relatedRecords > 0) {
      throw new BadRequestException("This product has business history. Deactivate it instead.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productPriceHistory.deleteMany({
        where: { productId: id, companyId }
      });

      await tx.product.delete({
        where: { id, companyId }
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "PRODUCT_DELETED",
          entity: "Product",
          entityId: product.id,
          metadata: {
            sku: product.sku,
            name: product.name
          }
        }
      });
    });

    return {
      id: product.id,
      deletedById: actorUserId
    };
  }
}
