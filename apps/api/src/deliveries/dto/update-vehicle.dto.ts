import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  plateNumber?: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
