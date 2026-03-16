import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "crypto";

import { MailerService } from "../mailer/mailer.service";
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

export type SessionContext = {
  ip?: string | null;
  userAgent?: string | null;
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
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {
    const configuredRounds = Number(config.get("BCRYPT_SALT_ROUNDS"));
    this.saltRounds =
      Number.isFinite(configuredRounds) && configuredRounds > 0
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
    context: SessionContext = {},
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
    context: SessionContext = {},
  ): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await this.comparePassword(
      input.password,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.issueAccessTokenForUser(user, context);
    return { user: this.toPublicUser(user), accessToken };
  }

  async requestPasswordReset(input: { email: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }

    const resetToken = this.generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await this.prisma.magicLink.create({
      data: {
        email,
        token: resetToken,
        expiresAt,
      },
    });

    const resetUrl = this.buildPasswordResetUrl(resetToken);
    await this.mailer.sendPasswordResetLink(email, resetUrl);
  }

  async resetPassword(input: {
    token: string;
    password: string;
  }): Promise<void> {
    const token = input.token.trim();
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { token },
    });

    if (
      !magicLink ||
      magicLink.usedAt ||
      magicLink.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: magicLink.email },
    });
    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await this.hashPassword(input.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async authenticate(
    token: string,
  ): Promise<{ payload: JwtPayload; user: PublicUser }> {
    const payload = this.decodeToken(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid token");
    }

    await this.assertSessionIsActive(payload);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
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

  async refreshAccessToken(token: string): Promise<AuthResult> {
    const payload = this.decodeToken(token);
    if (!payload?.sid) {
      throw new UnauthorizedException("Invalid token");
    }

    const session = await this.sessions.findByToken(payload.sid);
    if (!session || session.userId !== payload.sub || session.revokedAt) {
      throw new UnauthorizedException("Session is not active");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessions.revoke(payload.sid, new Date());
      throw new UnauthorizedException("Session expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      sid: payload.sid,
    });
    const verified = this.decodeToken(accessToken);
    if (!verified?.exp) {
      throw new UnauthorizedException("Unable to create session token");
    }

    await this.sessions.extend(payload.sid, new Date(verified.exp * 1000));

    return { user: this.toPublicUser(user), accessToken };
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
    context: SessionContext,
  ): Promise<string> {
    const sid = randomUUID();
    const accessToken = this.signToken({
      sub: user.id,
      email: user.email,
      sid,
    });
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

  private generateMagicLinkToken(): string {
    return randomBytes(32).toString("hex");
  }

  private buildPasswordResetUrl(token: string): string {
    const appUrl =
      this.config.get<string>("APP_URL") ?? "http://localhost:3000";
    const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    return `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
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
