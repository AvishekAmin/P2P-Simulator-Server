import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.url(),
  DIRECT_DATABASE_URL: z.url(),

  REDIS_URL: z.url().default("redis://localhost:6379"),

  GEMINI_API_KEY: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  DEV_ORGANIZATION_ID: z.string().default("dev-org"),
  DEV_USER_ID: z.string().default("dev-user"),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const invalidKeys = Object.keys(z.flattenError(parsed.error).fieldErrors);
  console.error(
    `Invalid environment variables: ${invalidKeys.join(", ")}. Check your .env file against .env.example.`,
  );
  process.exit(1);
}
