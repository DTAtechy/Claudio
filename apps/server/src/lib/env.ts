import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  STORAGE_DIR: z.string().default("./storage"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  AI_PROVIDER: z.enum(["anthropic", "openai", "none"]).default("none"),
  ANTHROPIC_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OUTLOOK_WEBHOOK_SECRET: z.string().default(""),
  PHONE_WEBHOOK_SECRET: z.string().default(""),
  PUBLIC_FORM_ALLOWED_ORIGINS: z.string().default(""),
});

export const env = schema.parse(process.env);
