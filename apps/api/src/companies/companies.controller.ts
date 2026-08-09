import { Body, Controller, Get, Inject, Patch, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CompaniesService } from "./companies.service";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";

@Controller("company")
export class CompaniesController {
  constructor(@Inject(CompaniesService) private readonly companiesService: CompaniesService) {}

  @Get("profile")
  profile(@Req() request: AuthenticatedRequest) {
    return this.companiesService.getProfile(request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch("profile")
  updateProfile(@Body() dto: UpdateCompanyProfileDto, @Req() request: AuthenticatedRequest) {
    return this.companiesService.updateProfile(request.user.companyId, dto);
  }
}
