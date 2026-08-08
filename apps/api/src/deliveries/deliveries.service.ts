import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryStatus, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";

@Injectable()
export class DeliveriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.deliveryTrip.findMany({
      include: { driver: true, vehicle: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  listVehicles() {
    return this.prisma.vehicle.findMany({
      where: { isActive: true },
      include: { driver: true },
      orderBy: { plateNumber: "asc" }
    });
  }

  async create(dto: CreateDeliveryTripDto, actorUserId: string, actorRole: string) {
    const [warehouse, vehicle, driver] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      this.prisma.user.findUnique({ where: { id: dto.driverId }, include: { role: true } })
    ]);

    if (!warehouse) throw new NotFoundException("Warehouse not found");
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    if (!driver) throw new NotFoundException("Driver not found");
    if (driver.role.name !== "DRIVER") throw new BadRequestException("Selected user must have the DRIVER role");
    if (!driver.isActive) throw new BadRequestException("Selected driver account is inactive");

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await this.assertWarehouseStockCanLoad({
          productId: item.productId,
          warehouseId: dto.warehouseId,
          quantity: item.loadedQuantity,
          allowNegativeStock: dto.allowNegativeStock,
          actorRole,
          tx
        });
      }

      const trip = await tx.deliveryTrip.create({
        data: {
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          route: dto.route,
          status: DeliveryStatus.ON_ROUTE,
          loadedAt: new Date(),
          items: {
            create: dto.items
          }
        },
        include: { driver: true, vehicle: true, items: { include: { product: true } } }
      });

      for (const item of trip.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            movementType: StockMovementType.TRUCK_LOAD,
            quantity: item.loadedQuantity,
            unitCost: item.product.unitCost,
            referenceType: "DELIVERY_TRIP",
            referenceId: trip.id,
            note: `Loaded to ${trip.vehicle.plateNumber} for ${trip.route}`,
            createdById: actorUserId
          }
        });
      }

      return trip;
    });
  }

  async reconcile(tripId: string, dto: ReconcileDeliveryTripDto, actorUserId: string) {
    const trip = await this.prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, items: { include: { product: true } } }
    });

    if (!trip) throw new NotFoundException("Delivery trip not found");
    if (trip.status === DeliveryStatus.CLOSED) {
      throw new BadRequestException("Delivery trip is already closed");
    }

    const loadMovement = await this.prisma.stockMovement.findFirst({
      where: {
        referenceType: "DELIVERY_TRIP",
        referenceId: trip.id,
        movementType: StockMovementType.TRUCK_LOAD
      },
      select: { warehouseId: true }
    });
    if (!loadMovement) throw new BadRequestException("Delivery trip has no stock load ledger");

    const tripItemById = new Map(trip.items.map((item) => [item.id, item]));

    for (const item of dto.items) {
      const tripItem = tripItemById.get(item.itemId);
      if (!tripItem) throw new BadRequestException("Reconciliation item does not belong to trip");

      const accounted = item.deliveredQuantity + item.returnedQuantity + item.damagedQuantity;
      if (accounted !== tripItem.loadedQuantity) {
        throw new BadRequestException("Delivered, returned, and damaged quantities must equal loaded quantity");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const tripItem = tripItemById.get(item.itemId);
        if (!tripItem) throw new BadRequestException("Reconciliation item does not belong to trip");

        await tx.deliveryTripItem.update({
          where: { id: item.itemId },
          data: {
            deliveredQuantity: item.deliveredQuantity,
            returnedQuantity: item.returnedQuantity,
            damagedQuantity: item.damagedQuantity
          }
        });

        if (item.returnedQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              productId: tripItem.productId,
              warehouseId: loadMovement.warehouseId,
              movementType: StockMovementType.TRUCK_RETURN,
              quantity: item.returnedQuantity,
              unitCost: tripItem.product.unitCost,
              referenceType: "DELIVERY_TRIP",
              referenceId: trip.id,
              note: `Returned from ${trip.vehicle.plateNumber} after ${trip.route}`,
              createdById: actorUserId
            }
          });
        }
      }

      return tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          status: DeliveryStatus.CLOSED,
          cashCollected: dto.cashCollected,
          creditIssued: dto.creditIssued,
          returnedAt: new Date()
        },
        include: { driver: true, vehicle: true, items: { include: { product: true } } }
      });
    });
  }

  private async assertWarehouseStockCanLoad(input: {
    productId: string;
    warehouseId: string;
    quantity: number;
    allowNegativeStock?: boolean;
    actorRole: string;
    tx: Prisma.TransactionClient;
  }) {
    const product = await input.tx.product.findUnique({ where: { id: input.productId }, select: { id: true, isActive: true } });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.isActive) throw new BadRequestException("Inactive products cannot be loaded to a truck");

    const movements = await input.tx.stockMovement.findMany({
      where: { productId: input.productId, warehouseId: input.warehouseId },
      select: { movementType: true, quantity: true }
    });
    const balance = movements.reduce((sum, movement) => sum + this.signedQuantity(movement.movementType, movement.quantity), 0);
    if (balance - input.quantity >= 0) return;

    if (input.allowNegativeStock && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) return;
    throw new BadRequestException("Truck load would make warehouse inventory negative");
  }

  private signedQuantity(movementType: StockMovementType, quantity: number) {
    if (
      movementType === StockMovementType.PURCHASE_RECEIPT ||
      movementType === StockMovementType.TRUCK_RETURN ||
      movementType === StockMovementType.TRANSFER_IN
    ) {
      return quantity;
    }
    if (movementType === StockMovementType.COUNT_ADJUSTMENT) return quantity;
    return -quantity;
  }
}
