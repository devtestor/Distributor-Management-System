import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { Roles } from "../common/roles.decorator";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get()
  list() {
    return this.customersService.list();
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT")
  @Get("debt-aging")
  debtAging() {
    return this.customersService.getDebtAging();
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id/balance")
  balance(@Param("id") id: string) {
    return this.customersService.getBalance(id);
  }

  @Roles("OWNER", "ADMIN", "ACCOUNTANT", "SALESPERSON")
  @Get(":id/account-history")
  accountHistory(@Param("id") id: string) {
    return this.customersService.getAccountHistory(id);
  }
}
