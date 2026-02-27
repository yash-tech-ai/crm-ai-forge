const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const optionalEnv = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "3001"), 10),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),

  // Database
  DATABASE_URL: requiredEnv("DATABASE_URL"),

  // Redis
  REDIS_URL: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  // Auth
  JWT_SECRET: requiredEnv("JWT_SECRET"),
  JWT_REFRESH_SECRET: requiredEnv("JWT_REFRESH_SECRET"),

  // CORS
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),
} as const;
