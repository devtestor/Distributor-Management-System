import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryStatus } from "@prisma/client";
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

  async create(dto: CreateDeliveryTripDto) {
    const [vehicle, driver] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      this.prisma.user.findUnique({ where: { id: dto.driverId }, include: { role: true } })
    ]);

    if (!vehicle) throw new NotFoundException("Vehicle not found");
    if (!driver) throw new NotFoundException("Driver not found");

    return this.prisma.deliveryTrip.create({
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
  }

  async reconcile(tripId: string, dto: ReconcileDeliveryTripDto) {
    const trip = await this.prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: { items: true }
    });

    if (!trip) throw new NotFoundException("Delivery trip not found");
    if (trip.status === DeliveryStatus.CLOSED) {
      throw new BadRequestException("Delivery trip is already closed");
    }

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
        await tx.deliveryTripItem.update({
          where: { id: item.itemId },
          data: {
            deliveredQuantity: item.deliveredQuantity,
            returnedQuantity: item.returnedQuantity,
            damagedQuantity: item.damagedQuantity
          }
        });
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
}
