import { DebtCollectionStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateDebtCollectionActivityDto {
  @IsEnum(DebtCollectionStatus)
  status!: DebtCollectionStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  nextFollowUpAt?: string;
}
