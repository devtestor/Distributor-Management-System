import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CancelInvoiceDto } from "./dto/cancel-invoice.dto";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateEbmStatusDto } from "./dto/update-ebm-status.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoicesService: InvoicesService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.list(request.user.id, request.user.role, request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id")
  get(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.get(id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.create(dto, request.user.id, request.user.role, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id/ebm")
  updateEbmStatus(@Param("id") id: string, @Body() dto: UpdateEbmStatusDto, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.updateEbmStatus(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Body() dto: CancelInvoiceDto, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.cancel(id, dto, request.user.id, request.user.companyId);
  }
}
