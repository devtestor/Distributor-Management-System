import { PackageType, ProductCategory } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsString()
  brand!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsEnum(PackageType)
  packageType!: PackageType;

  @IsString()
  unitSize!: string;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsInt()
  @Min(0)
  reorderLevel!: number;

  @IsBoolean()
  @IsOptional()
  tracksEmpties?: boolean;
}
