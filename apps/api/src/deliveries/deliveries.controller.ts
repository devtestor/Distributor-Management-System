import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateDeliveryTripDto } from "./dto/create-delivery-trip.dto";
import { CreateDeliveryProofDto } from "./dto/create-delivery-proof.dto";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { ReconcileDeliveryTripDto } from "./dto/reconcile-delivery-trip.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
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

  @Roles("OWNER", "ADMIN")
  @Post("vehicles")
  createVehicle(@Body() dto: CreateVehicleDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.createVehicle(dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch("vehicles/:id")
  updateVehicle(@Param("id") id: string, @Body() dto: UpdateVehicleDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.updateVehicle(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Delete("vehicles/:id")
  deleteVehicle(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.deleteVehicle(id, request.user.id, request.user.companyId);
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

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER", "SALESPERSON")
  @Post(":id/proofs")
  createProof(@Param("id") id: string, @Body() dto: CreateDeliveryProofDto, @Req() request: AuthenticatedRequest) {
    return this.deliveriesService.createProof(id, dto, request.user.id, request.user.role, request.user.companyId);
  }
}
