type ApiEnvironment = {
  API_PORT?: string;
  DATABASE_URL?: string;
  JWT_EXPIRES_IN?: string;
  JWT_SECRET?: string;
  NODE_ENV?: string;
  PORT?: string;
  WEB_ORIGIN?: string;
};

function requireValue(environment: ApiEnvironment, key: keyof ApiEnvironment) {
  const value = environment[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function assertLongSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  if (secret === "development-only-secret" || secret === "replace-this-with-a-long-random-secret") {
    throw new Error("JWT_SECRET must be replaced before starting the API");
  }
}

function assertValidPort(value: string, key: string) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${key} must be a valid TCP port`);
  }
}

export function validateEnvironment(environment: ApiEnvironment) {
  requireValue(environment, "DATABASE_URL");
  const jwtSecret = requireValue(environment, "JWT_SECRET");
  assertLongSecret(jwtSecret);

  if (environment.PORT) assertValidPort(environment.PORT, "PORT");
  if (environment.API_PORT) assertValidPort(environment.API_PORT, "API_PORT");

  const isProduction = environment.NODE_ENV === "production";
  if (isProduction) {
    requireValue(environment, "WEB_ORIGIN");
  }

  return environment;
}
