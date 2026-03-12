import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { SessionRepository } from "./session.repository";

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

type PrismaUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string | null;
  displayName: string | null;
  role: string;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  sid: string;
  exp?: number;
};

/**
 * Session model:
 * - Every issued access token includes a session id (`sid`).
 * - The sid is persisted in the Session table with server-side expiry/revocation state.
 * - Requests are accepted only when both JWT verification and Session state validation succeed.
 */
@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionRepository,
    config: ConfigService,
  ) {
    const configuredRounds = Number(config.get("BCRYPT_SALT_ROUNDS"));
    this.saltRounds = Number.isFinite(configuredRounds) && configuredRounds > 0
      ? configuredRounds
      : 10;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  signToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  decodeToken(token: string): JwtPayload | null {
    if (!token) return null;
    try {
      return this.jwt.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async register(
    input: {
      email: string;
      password: string;
      name?: string;
    },
    context: { ip?: string | null; userAgent?: string | null } = {},
  ): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Email already in use");
    }

    const passwordHash = await this.hashPassword(input.password);
    const name = input.name?.trim() || null;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        displayName: name,
      },
    });

    const accessToken = await this.issueAccessTokenForUser(user, context);
    return { user: this.toPublicUser(user), accessToken };
  }

  async login(
    input: { email: string; password: string },
    context: { ip?: string | null; userAgent?: string | null } = {},
  ): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await this.comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.issueAccessTokenForUser(user, context);
    return { user: this.toPublicUser(user), accessToken };
  }

  async authenticate(token: string): Promise<{ payload: JwtPayload; user: PublicUser }> {
    const payload = this.decodeToken(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid token");
    }

    await this.assertSessionIsActive(payload);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return { payload, user: this.toPublicUser(user) };
  }

  async validateUser(token: string): Promise<PublicUser> {
    const auth = await this.authenticate(token);
    return auth.user;
  }

  async revokeSessionFromToken(token: string): Promise<void> {
    const payload = this.decodeToken(token);
    if (!payload?.sid) {
      throw new UnauthorizedException("Invalid token");
    }

    await this.sessions.revoke(payload.sid, new Date());
  }

  private async assertSessionIsActive(payload: JwtPayload): Promise<void> {
    if (!payload.sid) {
      throw new UnauthorizedException("Invalid token");
    }

    const session = await this.sessions.findByToken(payload.sid);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Invalid token");
    }

    if (session.revokedAt) {
      throw new UnauthorizedException("Session revoked");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.revoke(payload.sid, new Date());
      throw new UnauthorizedException("Session expired");
    }
  }

  private async issueAccessTokenForUser(
    user: { id: string; email: string },
    context: { ip?: string | null; userAgent?: string | null },
  ): Promise<string> {
    const sid = randomUUID();
    const accessToken = this.signToken({ sub: user.id, email: user.email, sid });
    const verified = this.decodeToken(accessToken);
    if (!verified?.exp) {
      throw new UnauthorizedException("Unable to create session token");
    }

    await this.sessions.create({
      userId: user.id,
      token: sid,
      ip: context.ip ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt: new Date(verified.exp * 1000),
    });

    return accessToken;
  }

  private toPublicUser(user: PrismaUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.displayName ?? null,
      role: user.role,
    };
  }
}
