import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

type LoginRequest = {
  headers: {
    "x-forwarded-for"?: string | string[];
  };
  ip?: string;
};

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: LoginRequest) {
    const forwardedFor = request.headers["x-forwarded-for"];
    const clientIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0] || request.ip;
    return this.authService.login(dto, clientIp ?? "unknown");
  }
}
