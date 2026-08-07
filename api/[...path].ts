import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../apps/api/src/app.module";

let server: ((request: unknown, response: unknown) => void) | undefined;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  const config = app.get(ConfigService);
  const webOrigin = config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
  const allowedOrigins = webOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.init();
  return app.getHttpAdapter().getInstance() as (request: unknown, response: unknown) => void;
}

export default async function handler(request: unknown, response: unknown) {
  server ??= await bootstrapServer();
  return server(request, response);
}
