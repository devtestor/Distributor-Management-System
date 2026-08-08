import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

const loginWindowMs = 15 * 60 * 1000;
const maxFailedLoginAttempts = 8;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

@Injectable()
export class AuthService {
  private readonly failedLoginAttempts = new Map<string, LoginAttempt>();

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto, clientIp: string) {
    const attemptKey = this.loginAttemptKey(dto.email, clientIp);
    this.assertLoginAllowed(attemptKey);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    this.failedLoginAttempts.delete(attemptKey);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role.name
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role.name,
        preferredLocale: user.preferredLocale
      }
    };
  }

  private loginAttemptKey(email: string, clientIp: string) {
    return `${email.trim().toLowerCase()}:${clientIp.trim()}`;
  }

  private assertLoginAllowed(key: string) {
    const attempt = this.failedLoginAttempts.get(key);
    if (!attempt) return;

    const now = Date.now();
    if (now - attempt.firstAttemptAt > loginWindowMs) {
      this.failedLoginAttempts.delete(key);
      return;
    }

    if (attempt.count >= maxFailedLoginAttempts) {
      throw new HttpException("Too many login attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private recordFailedLogin(key: string) {
    const now = Date.now();
    const attempt = this.failedLoginAttempts.get(key);
    if (!attempt || now - attempt.firstAttemptAt > loginWindowMs) {
      this.failedLoginAttempts.set(key, { count: 1, firstAttemptAt: now });
      return;
    }

    attempt.count += 1;
  }
}
