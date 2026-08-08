import { Body, Controller, Get, Inject, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list() {
    return this.paymentsService.list();
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreatePaymentDto, @Req() request: AuthenticatedRequest) {
    return this.paymentsService.create(dto, request.user.id);
  }
}
