import { Locale } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsEnum(Locale)
  @IsOptional()
  preferredLocale?: Locale;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
