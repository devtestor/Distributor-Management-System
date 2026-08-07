import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { InvoicesService } from "./invoices.service";

@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list() {
    return this.invoicesService.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.invoicesService.get(id);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() request: AuthenticatedRequest) {
    return this.invoicesService.create(dto, request.user.id);
  }
}
