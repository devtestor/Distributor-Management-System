import { PaymentMethod } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class CreateInvoiceItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountAmount?: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsEnum(PaymentMethod)
  @IsOptional()
  initialPaymentMethod?: PaymentMethod;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialPaymentAmount?: number;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsBoolean()
  @IsOptional()
  allowCreditLimitOverride?: boolean;

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;
}
