import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEFAULT_BCRYPT_SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 12;

type BootstrapAdminInput = {
  email: string;
  name: string;
  password: string;
};

type ResetAdminPasswordInput = {
  email: string;
  password: string;
};

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email address is required.");
  }
  return normalized;
}

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("A non-empty admin name is required.");
  }
  return normalized;
}

function normalizePassword(password: string): string {
  const normalized = password.trim();
  if (normalized.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    );
  }
  return normalized;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

function resolveSaltRounds(): number {
  const configuredRounds = Number(process.env.BCRYPT_SALT_ROUNDS);
  if (Number.isFinite(configuredRounds) && configuredRounds > 0) {
    return configuredRounds;
  }

  return DEFAULT_BCRYPT_SALT_ROUNDS;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, resolveSaltRounds());
}

export async function bootstrapFirstAdminFromEnv() {
  return bootstrapFirstAdmin({
    email: getRequiredEnv("BOOTSTRAP_ADMIN_EMAIL"),
    name: getRequiredEnv("BOOTSTRAP_ADMIN_NAME"),
    password: getRequiredEnv("BOOTSTRAP_ADMIN_PASSWORD"),
  });
}

export async function bootstrapFirstAdmin(input: BootstrapAdminInput) {
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.super_admin },
    select: { id: true, email: true },
  });

  if (existingSuperAdmin) {
    return {
      status: "skipped" as const,
      reason: `A super_admin already exists (${existingSuperAdmin.email}).`,
    };
  }

  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const password = normalizePassword(input.password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    throw new Error(
      `Cannot create bootstrap super_admin because ${email} already exists with role ${existingUser.role}.`,
    );
  }

  const passwordHash = await hashPassword(password);
  const { firstName, lastName } = splitName(name);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      displayName: name,
      firstName,
      lastName,
      acceptedTerms: true,
      passwordHash,
      role: UserRole.super_admin,
      createdBy: "admin-bootstrap",
      updatedBy: "admin-bootstrap",
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return {
    status: "created" as const,
    user,
  };
}

export async function resetAdminPasswordFromEnv() {
  return resetAdminPassword({
    email: getRequiredEnv("ADMIN_RESET_EMAIL"),
    password: getRequiredEnv("ADMIN_RESET_PASSWORD"),
  });
}

export async function resetAdminPassword(input: ResetAdminPasswordInput) {
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new Error(`No user exists for ${email}.`);
  }

  if (user.role !== UserRole.admin && user.role !== UserRole.super_admin) {
    throw new Error(
      `Refusing to reset password for ${email} because role ${user.role} is not an admin role.`,
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        updatedBy: "admin-reset-password",
      },
    }),
    prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        updatedBy: "admin-reset-password",
      },
    }),
  ]);

  return {
    status: "updated" as const,
    user,
  };
}

export async function disconnectAdminOps() {
  await prisma.$disconnect();
}
