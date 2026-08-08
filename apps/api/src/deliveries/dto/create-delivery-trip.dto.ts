import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class DeliveryTripItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  loadedQuantity!: number;
}

export class CreateDeliveryTripDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  vehicleId!: string;

  @IsString()
  driverId!: string;

  @IsString()
  route!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryTripItemDto)
  items!: DeliveryTripItemDto[];

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;
}
