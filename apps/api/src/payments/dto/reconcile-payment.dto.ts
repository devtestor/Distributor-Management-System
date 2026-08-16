import { PaymentReconciliationStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class ReconcilePaymentDto {
  @IsEnum(PaymentReconciliationStatus)
  reconciliationStatus!: PaymentReconciliationStatus;

  @IsString()
  @IsOptional()
  reconciliationNote?: string;
}
