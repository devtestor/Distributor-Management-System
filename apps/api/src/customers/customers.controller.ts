import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateDebtCollectionActivityDto } from "./dto/create-debt-collection-activity.dto";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateDebtCollectionActivityDto } from "./dto/update-debt-collection-activity.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.customersService.list(request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreateCustomerDto, @Req() request: AuthenticatedRequest) {
    return this.customersService.create(dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @Req() request: AuthenticatedRequest) {
    return this.customersService.update(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Delete(":id")
  delete(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.customersService.delete(id, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT")
  @Get("debt-aging")
  debtAging(@Req() request: AuthenticatedRequest) {
    return this.customersService.getDebtAging(request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get("collection-activities")
  collectionActivities(@Req() request: AuthenticatedRequest) {
    return this.customersService.listDebtCollectionActivities(request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post("collection-activities")
  createCollectionActivity(@Body() dto: CreateDebtCollectionActivityDto, @Req() request: AuthenticatedRequest) {
    return this.customersService.createDebtCollectionActivity(dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Patch("collection-activities/:id")
  updateCollectionActivity(@Param("id") id: string, @Body() dto: UpdateDebtCollectionActivityDto, @Req() request: AuthenticatedRequest) {
    return this.customersService.updateDebtCollectionActivity(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id/balance")
  balance(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.customersService.getBalance(id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id/account-history")
  accountHistory(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.customersService.getAccountHistory(id, request.user.companyId);
  }
}
