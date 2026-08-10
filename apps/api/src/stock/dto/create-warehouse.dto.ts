import { IsOptional, IsString } from "class-validator";

export class CreateWarehouseDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  location?: string;
}
