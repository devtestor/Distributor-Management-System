import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class StockCountDto {
  @IsString()
  productId!: string;

  @IsString()
  warehouseId!: string;

  @IsInt()
  @Min(0)
  countedQuantity!: number;

  @IsString()
  @IsOptional()
  note?: string;
}
