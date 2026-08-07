import { StockMovementType } from "@prisma/client";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class StockMovementDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsEnum(StockMovementType)
  movementType!: StockMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;
}
