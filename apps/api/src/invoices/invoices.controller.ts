import { Body, Controller, Get, Inject, Param, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoicesService: InvoicesService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list(@Query() query: PaginationQuery) {
    return this.invoicesService.list(query);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.invoicesService.get(id);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.create(dto, request.user.id, request.user.role);
  }
}
