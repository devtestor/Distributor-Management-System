import { DebtCollectionActionType, DebtCollectionStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateDebtCollectionActivityDto {
  @IsString()
  customerId!: string;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsEnum(DebtCollectionActionType)
  actionType!: DebtCollectionActionType;

  @IsEnum(DebtCollectionStatus)
  @IsOptional()
  status?: DebtCollectionStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  promisedAmount?: number;

  @IsDateString()
  @IsOptional()
  promisedDate?: string;

  @IsDateString()
  @IsOptional()
  nextFollowUpAt?: string;
}
