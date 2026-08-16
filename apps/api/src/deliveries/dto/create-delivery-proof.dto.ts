import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateDeliveryProofDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  receiverName!: string;

  @IsString()
  @IsOptional()
  receiverPhone?: string;

  @IsDateString()
  @IsOptional()
  deliveredAt?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  signatureDataUrl?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
