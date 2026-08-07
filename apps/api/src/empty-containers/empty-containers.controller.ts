import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CreateEmptyContainerMovementDto } from "./dto/create-empty-container-movement.dto";
import { EmptyContainersService } from "./empty-containers.service";

@Controller("empty-containers")
export class EmptyContainersController {
  constructor(private readonly emptyContainersService: EmptyContainersService) {}

  @Get("customers/:customerId")
  customerLedger(@Param("customerId") customerId: string) {
    return this.emptyContainersService.customerLedger(customerId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "DRIVER", "SALESPERSON")
  @Post("movements")
  createMovement(@Body() dto: CreateEmptyContainerMovementDto, @Req() request: AuthenticatedRequest) {
    return this.emptyContainersService.createMovement(dto, request.user.id);
  }
}
