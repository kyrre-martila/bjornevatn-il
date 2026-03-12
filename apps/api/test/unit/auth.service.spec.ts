import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";

import { AuthService } from "../../src/modules/auth/auth.service";
import type { SessionRepository } from "../../src/modules/auth/session.repository";
import type { PrismaService } from "../../src/prisma/prisma.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = jest.requireMock("bcrypt") as {
  hash: jest.MockedFunction<(password: string, saltRounds: number) => Promise<string>>;
  compare: jest.MockedFunction<(plain: string, hash: string) => Promise<boolean>>;
};

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

type JwtMock = {
  sign: jest.Mock;
  verify: jest.Mock;
};

type SessionsMock = {
  create: jest.Mock;
  findByToken: jest.Mock;
  revoke: jest.Mock;
};

type ServiceOptions = {
  saltRounds?: number;
};

const createService = (options: ServiceOptions = {}) => {
  const prisma: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt: JwtMock = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const sessions: SessionsMock = {
    create: jest.fn(),
    findByToken: jest.fn(),
    revoke: jest.fn(),
  };

  const configGet = jest.fn((key: string) => {
    if (key === "BCRYPT_SALT_ROUNDS" && options.saltRounds !== undefined) {
      return String(options.saltRounds);
    }
    return undefined;
  });
  const config = {
    get: configGet,
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    sessions as unknown as SessionRepository,
    config,
  );

  return { service, prisma, jwt, sessions };
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a new user with hashed password and server-side session", async () => {
    const { service, prisma, jwt, sessions } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-pass");
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed-pass",
      name: "Test User",
      displayName: "Test User",
      role: "editor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    jwt.sign.mockReturnValue("signed-token");
    jwt.verify.mockReturnValue({ sub: "user-1", email: "test@example.com", sid: "sid-1", exp: 1_900_000_000 });

    const result = await service.register({
      email: "test@example.com",
      password: "Password123",
      name: "Test User",
    });

    expect(sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", token: expect.any(String) }),
    );
    expect(result).toEqual({
      user: { id: "user-1", email: "test@example.com", name: "Test User", role: "editor" },
      accessToken: "signed-token",
    });
  });

  it("rejects duplicate emails on registration", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.register({ email: "taken@example.com", password: "Password123" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("authenticates a user with valid credentials", async () => {
    const { service, prisma, jwt } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "stored-hash",
      name: null,
      displayName: null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("access-token");
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });

    const result = await service.login({ email: "user@example.com", password: "Secret123" });

    expect(result).toEqual({
      user: { id: "user-1", email: "user@example.com", name: null, role: "admin" },
      accessToken: "access-token",
    });
  });


  it("validates user when token and session are active", async () => {
    const { service, prisma, jwt, sessions } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });
    sessions.findByToken.mockResolvedValue({
      userId: "user-1",
      token: "sid-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      name: "User",
      displayName: "User",
      role: "editor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.validateUser("token")).resolves.toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      role: "editor",
    });
  });

  it("rejects revoked sessions", async () => {
    const { service, prisma, jwt, sessions } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });
    sessions.findByToken.mockResolvedValue({
      userId: "user-1",
      token: "sid-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      name: "User",
      displayName: "User",
      role: "editor",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("revokes expired sessions", async () => {
    const { service, jwt, sessions } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });
    sessions.findByToken.mockResolvedValue({
      userId: "user-1",
      token: "sid-1",
      expiresAt: new Date(Date.now() - 1_000),
      revokedAt: null,
    });

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessions.revoke).toHaveBeenCalled();
  });

  it("revokes session from token", async () => {
    const { service, jwt, sessions } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });

    await service.revokeSessionFromToken("token");

    expect(sessions.revoke).toHaveBeenCalledWith("sid-1", expect.any(Date));
  });


  it("throws when token payload cannot be decoded", async () => {
    const { service, jwt } = createService();
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    await expect(service.validateUser("bad-token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws when session record does not exist", async () => {
    const { service, jwt, sessions } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });
    sessions.findByToken.mockResolvedValue(null);

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws when token has no sid", async () => {
    const { service, jwt } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com" });

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws when user no longer exists", async () => {
    const { service, jwt, sessions, prisma } = createService();
    jwt.verify.mockReturnValue({ sub: "user-1", email: "user@example.com", sid: "sid-1", exp: 1_900_000_000 });
    sessions.findByToken.mockResolvedValue({
      userId: "user-1",
      token: "sid-1",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.validateUser("token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws when revokeSessionFromToken is called with invalid token", async () => {
    const { service, jwt } = createService();
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    await expect(service.revokeSessionFromToken("bad-token")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns null for invalid tokens", () => {
    const { service, jwt } = createService();
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid");
    });

    expect(service.decodeToken("bad-token")).toBeNull();
  });

  it("hashes passwords using configured salt rounds", async () => {
    const { service } = createService({ saltRounds: 12 });
    bcrypt.hash.mockResolvedValue("hashed");

    await service.hashPassword("Password123");

    expect(bcrypt.hash).toHaveBeenCalledWith("Password123", 12);
  });
});
