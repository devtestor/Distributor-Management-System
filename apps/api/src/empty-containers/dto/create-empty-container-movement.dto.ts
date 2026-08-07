import { EmptyMovementType } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateEmptyContainerMovementDto {
  @IsString()
  customerId!: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsEnum(EmptyMovementType)
  movementType!: EmptyMovementType;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  referenceType?: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
