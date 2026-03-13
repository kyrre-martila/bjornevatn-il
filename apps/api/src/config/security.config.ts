import { z } from "zod";

type Env = Record<string, string | undefined>;

const JWT_SECRET_MIN_LENGTH = 32;
const COOKIE_SECRET_MIN_LENGTH = 32;
const SECRET_MIN_UNIQUE_CHARACTERS = 10;

const weakSecretPatterns = [
  /^(.)\1+$/,
  /^(password|secret|changeme|change-me|default|test|example)$/i,
  /^change-me[-_a-z0-9]*$/i,
  /^replace[-_a-z0-9]*$/i,
  /^placeholder[-_a-z0-9]*$/i,
];

function hasCharacterVariety(value: string) {
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^a-zA-Z\d\s]/.test(value);
  return [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length >= 3;
}

function isWeakSecret(value: string) {
  return weakSecretPatterns.some((pattern) => pattern.test(value.trim()));
}

function buildSecretSchema(name: string, minLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${name} is required`)
    .min(minLength, `${name} must be at least ${minLength} characters long`)
    .refine(
      (value) => new Set(value).size >= SECRET_MIN_UNIQUE_CHARACTERS,
      `${name} must include at least ${SECRET_MIN_UNIQUE_CHARACTERS} unique characters`,
    )
    .refine(
      hasCharacterVariety,
      `${name} must include at least three of the following: lowercase letters, uppercase letters, numbers, symbols`,
    )
    .refine((value) => !isWeakSecret(value), `${name} is too weak; use a randomly generated secret`);
}

const schema = z.object({
  JWT_SECRET: buildSecretSchema("JWT_SECRET", JWT_SECRET_MIN_LENGTH),
  COOKIE_SECRET: buildSecretSchema("COOKIE_SECRET", COOKIE_SECRET_MIN_LENGTH),
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
