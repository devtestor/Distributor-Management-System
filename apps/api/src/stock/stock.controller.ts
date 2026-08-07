import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { StockMovementDto } from "./dto/stock-movement.dto";
import { StockService } from "./stock.service";

@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get("warehouses/:id/stock")
  warehouseStock(@Param("id") warehouseId: string) {
    return this.stockService.getWarehouseStock(warehouseId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/receive")
  receive(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({ ...dto, createdById: request.user.id });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/adjust")
  adjust(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({ ...dto, createdById: request.user.id });
  }
}
