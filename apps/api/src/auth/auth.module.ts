import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { JwtSignOptions } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) throw new Error("JWT_SECRET is required");

        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>("JWT_EXPIRES_IN") ?? "1h") as JwtSignOptions["expiresIn"]
          }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
