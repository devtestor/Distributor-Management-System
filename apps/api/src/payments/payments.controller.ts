import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { ReconcilePaymentDto } from "./dto/reconcile-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.list(request.user.id, request.user.role, request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.create(dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id/reconciliation")
  reconcile(@Param("id") id: string, @Body() dto: ReconcilePaymentDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.reconcile(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Delete(":id")
  delete(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.delete(id, request.user.id, request.user.companyId);
  }
}
