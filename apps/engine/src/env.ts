import path from "path";
import { config } from "dotenv";

// Load env files for local dev: prefer .env.local, then .env
config({ path: path.join(process.cwd(), ".env.local") });
config();

import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ENGINE_PORT: z.string().optional(),
  NODE_ENV: z.string().optional(),
  ENGINE_CORS_ORIGIN: z.string().optional(), // JSON array string, e.g. ["http://localhost:3000"]
});

export const env = envSchema.parse(process.env);
export const port = Number(env.ENGINE_PORT ?? 3001);
export const isProduction = (env.NODE_ENV ?? "development") === "production";
const defaultCors = ["http://localhost:3000"];
const corsSchema = z.array(z.string().min(1));

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return defaultCors;
  try {
    const parsed = JSON.parse(value);
    return corsSchema.parse(parsed);
  } catch {
    throw new Error(
      "ENGINE_CORS_ORIGIN must be a JSON array string, e.g. [\"http://localhost:3000\"]",
    );
  }
}

export const corsOrigins = parseCorsOrigins(env.ENGINE_CORS_ORIGIN);
export const corsAllowAll = corsOrigins.includes("*");
if (isProduction && corsAllowAll) {
  throw new Error("ENGINE_CORS_ORIGIN cannot include '*' in production");
}
