import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import type { PaginationQuery } from "../common/pagination";
import { Roles } from "../common/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON")
  @Get()
  list(@Query() query: PaginationQuery, @Req() request: AuthenticatedRequest) {
    return this.productsService.list(request.user.companyId, query);
  }

  @Roles("OWNER", "ADMIN")
  @Post()
  create(@Body() dto: CreateProductDto, @Req() request: AuthenticatedRequest) {
    return this.productsService.create(dto, request.user.companyId);
  }

  @Get(":id/price-history")
  @Roles("OWNER", "ADMIN")
  priceHistory(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.productsService.priceHistory(id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto, @Req() request: AuthenticatedRequest) {
    return this.productsService.update(id, dto, request.user.id, request.user.companyId);
  }

  @Roles("OWNER", "ADMIN")
  @Delete(":id")
  delete(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.productsService.delete(id, request.user.id, request.user.companyId);
  }
}
