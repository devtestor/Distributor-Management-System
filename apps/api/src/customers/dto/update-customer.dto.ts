import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  route?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
