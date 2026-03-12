import { z } from "zod";

type Env = Record<string, string | undefined>;

const JWT_SECRET_MIN_LENGTH = 32;
const COOKIE_SECRET_MIN_LENGTH = 32;
const ENCRYPTION_KEY_MIN_LENGTH = 32;

const schema = z.object({
  JWT_SECRET: z
    .string()
    .trim()
    .min(1, "JWT_SECRET is required")
    .min(
      JWT_SECRET_MIN_LENGTH,
      `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long`,
    ),
  COOKIE_SECRET: z
    .string()
    .trim()
    .min(1, "COOKIE_SECRET is required")
    .min(
      COOKIE_SECRET_MIN_LENGTH,
      `COOKIE_SECRET must be at least ${COOKIE_SECRET_MIN_LENGTH} characters long`,
    ),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .min(1, "ENCRYPTION_KEY is required")
    .min(
      ENCRYPTION_KEY_MIN_LENGTH,
      `ENCRYPTION_KEY must be at least ${ENCRYPTION_KEY_MIN_LENGTH} characters long`,
    ),
});

export function validateSecurityConfig(env: Env = process.env) {
  if (env.NODE_ENV === "test") {
    return;
  }

  const result = schema.safeParse(env);
  if (!result.success) {
    const fieldErrors = Object.entries(result.error.flatten().fieldErrors)
      .flatMap(
        ([field, messages]) =>
          messages?.map((message) => `${field}: ${message}`) ?? [],
      )
      .join(", ");
    throw new Error(
      `Security configuration invalid. Please set required secrets before starting the API. Missing/invalid: ${fieldErrors}`,
    );
  }
}
