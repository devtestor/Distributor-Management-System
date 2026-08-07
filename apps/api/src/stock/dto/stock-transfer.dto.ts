import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class StockTransferDto {
  @IsString()
  productId!: string;

  @IsString()
  fromWarehouseId!: string;

  @IsString()
  toWarehouseId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsBoolean()
  @IsOptional()
  allowNegative?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}
