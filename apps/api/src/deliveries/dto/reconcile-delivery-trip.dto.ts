import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from "class-validator";

class ReconcileDeliveryTripItemDto {
  @IsString()
  itemId!: string;

  @IsInt()
  @Min(0)
  deliveredQuantity!: number;

  @IsInt()
  @Min(0)
  returnedQuantity!: number;

  @IsInt()
  @Min(0)
  damagedQuantity!: number;
}

export class ReconcileDeliveryTripDto {
  @IsInt()
  @Min(0)
  cashCollected!: number;

  @IsInt()
  @Min(0)
  creditIssued!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReconcileDeliveryTripItemDto)
  items!: ReconcileDeliveryTripItemDto[];
}
