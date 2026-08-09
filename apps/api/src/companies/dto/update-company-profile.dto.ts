import { Locale } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

export class UpdateCompanyProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @IsOptional()
  industry?: string;

  @ValidateIf((_, value) => value !== "")
  @IsUrl({ require_protocol: true })
  @IsOptional()
  logoUrl?: string;

  @Matches(/^#[0-9a-fA-F]{6}$/)
  @IsOptional()
  primaryColor?: string;

  @Matches(/^#[0-9a-fA-F]{6}$/)
  @IsOptional()
  secondaryColor?: string;

  @Matches(/^[A-Z]{3}$/)
  @IsOptional()
  currency?: string;

  @IsEnum(Locale)
  @IsOptional()
  defaultLocale?: Locale;
}
