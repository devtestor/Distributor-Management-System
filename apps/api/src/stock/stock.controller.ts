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
  warehouses(@Req() request: AuthenticatedRequest) {
    return this.stockService.listWarehouses(request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("stock/movements")
  movements(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.stockService.listMovements(request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Get("warehouses/:id/stock")
  warehouseStock(@Param("id") warehouseId: string, @Req() request: AuthenticatedRequest) {
    return this.stockService.getWarehouseStock(warehouseId, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/receive")
  receive(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({
      ...dto,
      companyId: request.user.companyId,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/adjust")
  adjust(@Body() dto: StockMovementDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordMovement({
      ...dto,
      companyId: request.user.companyId,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/transfer")
  transfer(@Body() dto: StockTransferDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.transferStock({
      ...dto,
      companyId: request.user.companyId,
      createdById: request.user.id,
      actorRole: request.user.role
    });
  }

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER")
  @Post("stock/count")
  count(@Body() dto: StockCountDto, @Req() request: AuthenticatedRequest) {
    return this.stockService.recordStockCount({
      ...dto,
      companyId: request.user.companyId,
      createdById: request.user.id
    });
  }
}
