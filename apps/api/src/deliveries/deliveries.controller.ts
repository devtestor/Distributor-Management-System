import { Body, Controller, Get, Inject, Param, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";
import { DeliveriesService } from "./deliveries.service";

@Controller("deliveries/trips")
export class DeliveriesController {
  constructor(@Inject(DeliveriesService) private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list() {
    return this.deliveriesService.list();
  }

  @Get("vehicles")
  vehicles() {
    return this.deliveriesService.listVehicles();
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post()
  create(@Body() dto: CreateDeliveryTripDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.create(dto, request.user.id, request.user.role);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER")
  @Post(":id/reconcile")
  reconcile(@Param("id") id: string, @Body() dto: ReconcileDeliveryTripDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.reconcile(id, dto, request.user.id);
  }
}
