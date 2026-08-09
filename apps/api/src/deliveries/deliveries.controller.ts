import { Body, Controller, Get, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";
import { DeliveriesService } from "./deliveries.service";

@Controller("deliveries/trips")
export class DeliveriesController {
  constructor(@Inject(DeliveriesService) private readonly deliveriesService: DeliveriesService) {}

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER")
  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: PaginationQuery) {
    return this.deliveriesService.list(request.user.id, request.user.role, request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("vehicles")
  vehicles(@Req() request: AuthenticatedRequest) {
    return this.deliveriesService.listVehicles(request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post()
  create(@Body() dto: CreateDeliveryTripDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.create(dto, request.user.id, request.user.role, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER")
  @Post(":id/reconcile")
  reconcile(@Param("id") id: string, @Body() dto: ReconcileDeliveryTripDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.reconcile(id, dto, request.user.id, request.user.companyId);
  }
}
