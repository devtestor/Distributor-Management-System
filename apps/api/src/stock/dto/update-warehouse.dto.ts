import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateWarehouseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
