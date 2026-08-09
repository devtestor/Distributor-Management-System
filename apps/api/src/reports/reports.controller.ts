import { Controller, Get, Inject, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { ReportsService } from "./reports.service";

@Controller("reports")
@Roles("OWNER", "ADMIN", "ACCOUNTANT")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("sales")
  sales(@Query("from") from: string | undefined, @Query("to") to: string | undefined, @Req() request: AuthenticatedRequest) {
    return this.reportsService.sales({ companyId: request.user.companyId, from, to });
  }

  @Get("stock")
  stock(@Req() request: AuthenticatedRequest) {
    return this.reportsService.stock(request.user.companyId);
  }

  @Get("debt")
  debt(@Req() request: AuthenticatedRequest) {
    return this.reportsService.debt(request.user.companyId);
  }

  @Get("empties")
  empties(@Req() request: AuthenticatedRequest) {
    return this.reportsService.empties(request.user.companyId);
  }
}
