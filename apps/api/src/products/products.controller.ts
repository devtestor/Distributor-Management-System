import { Body, Controller, Get, Inject, Param, Patch, Post, Req } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/authenticated-request";
import { Roles } from "../common/roles.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Roles("OWNER", "ADMIN", "WAREHOUSE_MANAGER", "SALESPERSON")
  @Get()
  list() {
    return this.productsService.list();
  }

  @Roles("OWNER", "ADMIN")
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get(":id/price-history")
  @Roles("OWNER", "ADMIN")
  priceHistory(@Param("id") id: string) {
    return this.productsService.priceHistory(id);
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto, @Req() request: AuthenticatedRequest) {
    return this.productsService.update(id, dto, request.user.id);
  }
}
