import { PaymentMethod } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  customerId!: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsOptional()
  reference?: string;
}
