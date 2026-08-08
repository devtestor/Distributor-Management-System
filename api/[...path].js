require("reflect-metadata");

const { ValidationPipe } = require("@nestjs/common");
const { ConfigService } = require("@nestjs/config");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/api/app.module");

let server;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });
  const config = app.get(ConfigService);
  const webOrigin = config.get("WEB_ORIGIN") ?? "http://localhost:3000";
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
  return app.getHttpAdapter().getInstance();
}

module.exports = async function handler(request, response) {
  server ??= await bootstrapServer();
  return server(request, response);
};
