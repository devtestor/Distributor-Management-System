import { Body, Controller, Get, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateEmptyContainerMovementDto } from "./dto/create-empty-container-movement.dto";
import { EmptyContainersService } from "./empty-containers.service";

@Controller("empty-containers")
export class EmptyContainersController {
  constructor(@Inject(EmptyContainersService) private readonly emptyContainersService: EmptyContainersService) {}

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON", "ACCOUNTANT")
  @Get("movements")
  movements(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.emptyContainersService.listMovements(request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON", "ACCOUNTANT")
  @Get("customers/:customerId")
  customerLedger(@Param("customerId") customerId: string, @Req() request: AuthenticatedRequest) {
    return this.emptyContainersService.customerLedger(customerId, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON")
  @Post("movements")
  createMovement(@Body() dto: CreateEmptyContainerMovementDto, @Req() request: AuthenticatedRequest) {
    return this.emptyContainersService.createMovement(dto, request.user.id, request.user.companyId);
  }
}
