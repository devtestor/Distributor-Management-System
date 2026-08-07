import { Controller, Get } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT")
  @Get("owner")
  ownerDashboard() {
    return this.dashboardService.getOwnerDashboard();
  }
}
