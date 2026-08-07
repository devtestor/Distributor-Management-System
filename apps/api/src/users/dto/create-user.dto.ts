import { Locale } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  role!: string;

  @IsEnum(Locale)
  preferredLocale!: Locale;

  @IsString()
  @MinLength(8)
  password!: string;
}
