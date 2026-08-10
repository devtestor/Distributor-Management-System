import { IsOptional, IsString } from "class-validator";

export class CreateVehicleDto {
  @IsString()
  plateNumber!: string;

  @IsString()
  @IsOptional()
  driverId?: string;
}
