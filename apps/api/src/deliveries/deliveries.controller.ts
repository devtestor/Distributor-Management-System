import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";
import { DeliveriesService } from "./deliveries.service";

@Controller("deliveries/trips")
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list() {
    return this.deliveriesService.list();
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post()
  create(@Body() dto: CreateDeliveryTripDto) {
    return this.deliveriesService.create(dto);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER")
  @Post(":id/reconcile")
  reconcile(@Param("id") id: string, @Body() dto: ReconcileDeliveryTripDto) {
    return this.deliveriesService.reconcile(id, dto);
  }
}
