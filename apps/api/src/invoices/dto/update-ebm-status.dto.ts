import { EBMStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateEbmStatusDto {
  @IsEnum(EBMStatus)
  ebmStatus!: EBMStatus;

  @IsString()
  @IsOptional()
  ebmReceiptNumber?: string;

  @IsString()
  @IsOptional()
  ebmSdcId?: string;

  @IsString()
  @IsOptional()
  ebmSignature?: string;

  @IsDateString()
  @IsOptional()
  ebmSubmittedAt?: string;
}
