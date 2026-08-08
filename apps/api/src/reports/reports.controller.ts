import { Controller, Get, Inject, Query } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@Roles("OWNER", "ACCOUNTANT")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("sales")
  sales(@Query("from") from?: string, @Query("to") to?: string) {
    return this.reportsService.sales({ from, to });
  }

  @Get("stock")
  stock() {
    return this.reportsService.stock();
  }

  @Get("debt")
  debt() {
    return this.reportsService.debt();
  }

  @Get("empties")
  empties() {
    return this.reportsService.empties();
  }
}
