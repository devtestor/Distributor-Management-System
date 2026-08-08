import { Body, Controller, Get, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { StockCountDto } from "./dto/stock-count.dto";
import { StockMovementDto } from "./dto/stock-movement.dto";
import { StockTransferDto } from "./dto/stock-transfer.dto";
import { StockService } from "./stock.service";

@Controller()
export class StockController {
  constructor(@Inject(StockService) private readonly stockService: StockService) {}

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("warehouses")
  warehouses() {
    return this.stockService.listWarehouses();
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("stock/movements")
  movements(@Query() query: PaginationQuery) {
    return this.stockService.listMovements(query);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("warehouses/:id/stock")
  warehouseStock(@Param("id") warehouseId: string) {
    return this.stockService.getWarehouseStock(warehouseId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/receive")
  receive(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({
      ...dto,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/adjust")
  adjust(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({
      ...dto,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/transfer")
  transfer(@Body() dto: StockTransferDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.transferStock({
      ...dto,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/count")
  count(@Body() dto: StockCountDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordStockCount({
      ...dto,
      createdById: request.user.id
    });
  }
}
