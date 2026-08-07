import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.product.findMany({
      orderBy: { name: "asc" }
    });
  }

  async create(dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          ...dto,
          unitCost: dto.unitCost,
          unitPrice: dto.unitPrice,
          tracksEmpties: dto.tracksEmpties ?? false,
          priceHistory: {
            create: {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Product SKU already exists");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, actorUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id }
    });
    if (!product) throw new NotFoundException("Product not found");

    const nextUnitCost = dto.unitCost ?? product.unitCost;
    const nextUnitPrice = dto.unitPrice ?? product.unitPrice;
    const priceChanged = Number(nextUnitCost) !== Number(product.unitCost) || Number(nextUnitPrice) !== Number(product.unitPrice);
    const { priceChangeReason, ...productData } = dto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id },
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

  priceHistory(productId: string) {
    return this.prisma.productPriceHistory.findMany({
      where: { productId },
      include: {
        changedBy: {
          include: { role: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }
}
