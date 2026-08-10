import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryStatus, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginationArgs, type PaginationQuery } from "../common/pagination";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";

@Injectable()
export class DeliveriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(actorUserId: string, actorRole: string, companyId: string, query?: PaginationQuery) {
    return this.prisma.deliveryTrip.findMany({
      where: actorRole === "DRIVER" ? { companyId, driverId: actorUserId } : { companyId },
      include: { driver: true, vehicle: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(query)
    });
  }

  listVehicles(companyId: string) {
    return this.prisma.vehicle.findMany({
      where: { companyId },
      include: { driver: true },
      orderBy: { plateNumber: "asc" }
    });
  }

  async createVehicle(dto: CreateVehicleDto, actorUserId: string, companyId: string) {
    if (dto.driverId) {
      await this.assertDriverCanBeAssigned(dto.driverId, companyId);
    }

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          companyId,
          plateNumber: dto.plateNumber,
          driverId: dto.driverId
        },
        include: { driver: true }
      });

      await this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "VEHICLE_CREATED",
          entity: "Vehicle",
          entityId: vehicle.id,
          metadata: {
            plateNumber: vehicle.plateNumber,
            driverId: vehicle.driverId
          }
        }
      });

      return vehicle;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("Vehicle plate number already exists");
      }
      throw error;
    }
  }

  async updateVehicle(vehicleId: string, dto: UpdateVehicleDto, actorUserId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId, companyId }
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    if (dto.driverId) {
      await this.assertDriverCanBeAssigned(dto.driverId, companyId);
    }

    try {
      const updated = await this.prisma.vehicle.update({
        where: { id: vehicleId, companyId },
        data: {
          plateNumber: dto.plateNumber,
          driverId: dto.driverId === "" ? null : dto.driverId,
          isActive: dto.isActive
        },
        include: { driver: true }
      });

      await this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "VEHICLE_UPDATED",
          entity: "Vehicle",
          entityId: updated.id,
          metadata: {
            plateNumber: updated.plateNumber,
            driverId: updated.driverId,
            isActive: updated.isActive
          }
        }
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("Vehicle plate number already exists");
      }
      throw error;
    }
  }

  async deleteVehicle(vehicleId: string, actorUserId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId, companyId },
      include: { _count: { select: { trips: true } } }
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    if (vehicle._count.trips > 0) {
      throw new BadRequestException("This vehicle has delivery history. Deactivate it instead.");
    }

    await this.prisma.vehicle.delete({
      where: { id: vehicleId, companyId }
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorUserId,
        companyId,
        action: "VEHICLE_DELETED",
        entity: "Vehicle",
        entityId: vehicle.id,
        metadata: {
          plateNumber: vehicle.plateNumber,
          driverId: vehicle.driverId
        }
      }
    });

    return {
      id: vehicle.id,
      deletedById: actorUserId
    };
  }

  async create(dto: CreateDeliveryTripDto, actorUserId: string, actorRole: string, companyId: string) {
    const [warehouse, vehicle, driver] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId, companyId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId, companyId } }),
      this.prisma.user.findUnique({ where: { id: dto.driverId, companyId }, include: { role: true } })
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
          companyId,
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
          companyId,
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
            companyId,
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

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "CREATE",
          entity: "DeliveryTrip",
          entityId: trip.id,
          metadata: {
            route: trip.route,
            vehicleId: trip.vehicleId,
            driverId: trip.driverId,
            itemCount: trip.items.length
          }
        }
      });

      return trip;
    });
  }

  async reconcile(tripId: string, dto: ReconcileDeliveryTripDto, actorUserId: string, companyId: string) {
    const trip = await this.prisma.deliveryTrip.findUnique({
      where: { id: tripId, companyId },
      include: { vehicle: true, items: { include: { product: true } } }
    });

    if (!trip) throw new NotFoundException("Delivery trip not found");
    if (trip.driverId !== actorUserId) {
      const actor = await this.prisma.user.findUnique({ where: { id: actorUserId, companyId }, include: { role: true } });
      if (!actor || !["OWNER", "ADMIN", "WAREHOUSE_MANAGER"].includes(actor.role.name)) {
        throw new ForbiddenException("Driver can only reconcile assigned trips");
      }
    }
    if (trip.status === DeliveryStatus.CLOSED) {
      throw new BadRequestException("Delivery trip is already closed");
    }

    const loadMovement = await this.prisma.stockMovement.findFirst({
      where: {
        referenceType: "DELIVERY_TRIP",
        companyId,
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
              companyId,
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

      const updated = await tx.deliveryTrip.update({
        where: { id: tripId, companyId },
        data: {
          status: DeliveryStatus.CLOSED,
          cashCollected: dto.cashCollected,
          creditIssued: dto.creditIssued,
          returnedAt: new Date()
        },
        include: { driver: true, vehicle: true, items: { include: { product: true } } }
      });

      await tx.auditLog.create({
        data: {
          userId: actorUserId,
          companyId,
          action: "RECONCILE",
          entity: "DeliveryTrip",
          entityId: trip.id,
          metadata: {
            cashCollected: dto.cashCollected,
            creditIssued: dto.creditIssued,
            itemCount: dto.items.length
          }
        }
      });

      return updated;
    });
  }

  private async assertWarehouseStockCanLoad(input: {
    productId: string;
    companyId: string;
    warehouseId: string;
    quantity: number;
    allowNegativeStock?: boolean;
    actorRole: string;
    tx: Prisma.TransactionClient;
  }) {
    const product = await input.tx.product.findUnique({ where: { id: input.productId, companyId: input.companyId }, select: { id: true, isActive: true } });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.isActive) throw new BadRequestException("Inactive products cannot be loaded to a truck");

    const movements = await input.tx.stockMovement.findMany({
      where: { productId: input.productId, warehouseId: input.warehouseId, companyId: input.companyId },
      select: { movementType: true, quantity: true }
    });
    const balance = movements.reduce((sum, movement) => sum + this.signedQuantity(movement.movementType, movement.quantity), 0);
    if (balance - input.quantity >= 0) return;

    if (input.allowNegativeStock && (input.actorRole === "OWNER" || input.actorRole === "ADMIN")) return;
    throw new BadRequestException("Truck load would make warehouse inventory negative");
  }

  private async assertDriverCanBeAssigned(driverId: string, companyId: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId, companyId },
      include: { role: true }
    });
    if (!driver) throw new NotFoundException("Driver not found");
    if (driver.role.name !== "DRIVER") throw new BadRequestException("Selected user must have the DRIVER role");
    if (!driver.isActive) throw new BadRequestException("Selected driver account is inactive");
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
