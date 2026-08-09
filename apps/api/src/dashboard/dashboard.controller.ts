import { Controller, Get, Inject, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT")
  @Get("owner")
  ownerDashboard(@Req() request: AuthenticatedRequest) {
    return this.dashboardService.getOwnerDashboard(request.user.companyId);
  }
}
