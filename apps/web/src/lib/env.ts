import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  DATABASE_URL: optionalUrl,
  NEXTAUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  NEXTAUTH_URL: optionalUrl,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  EMAIL_SERVER_HOST: optionalString,
  EMAIL_SERVER_PORT: optionalString,
  EMAIL_SERVER_USER: optionalString,
  EMAIL_SERVER_PASSWORD: optionalString,
  EMAIL_FROM: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_ID: optionalString,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  PUSHER_APP_ID: optionalString,
  PUSHER_KEY: optionalString,
  PUSHER_SECRET: optionalString,
  NEXT_PUBLIC_PUSHER_KEY: optionalString,
  NEXT_PUBLIC_PUSHER_CLUSTER: optionalString,
  PUSHER_CLUSTER: optionalString,
  S3_ENDPOINT: optionalUrl,
  S3_REGION: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_BUCKET: optionalString,
  MEILI_ENABLED: optionalString
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  const issues = parseResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  console.warn("Environment validation issues:", issues.join("; "));
}

export const env = parseResult.success
  ? parseResult.data
  : (({
      ...process.env
    } as unknown) as z.infer<typeof envSchema>);

export const hasDatabaseUrl = Boolean(env.DATABASE_URL);
