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

  // SMTP (optional — if not set, emails are logged only)
  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: parseInt(optionalEnv("SMTP_PORT", "587"), 10),
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  DEFAULT_FROM_EMAIL: optionalEnv("DEFAULT_FROM_EMAIL", "noreply@crm-ai-forge.local"),
  DEFAULT_FROM_NAME: optionalEnv("DEFAULT_FROM_NAME", "CRM AI Forge"),

  // App URL (for tracking links)
  APP_URL: optionalEnv("APP_URL", "http://localhost:3001"),
} as const;
