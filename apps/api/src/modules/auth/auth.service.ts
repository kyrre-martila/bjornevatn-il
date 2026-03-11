import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../../prisma/prisma.service";

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

type JwtPayload = { sub: string; email: string };

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResult> {
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

    const accessToken = this.signToken({ sub: user.id, email: user.email });
    return { user: this.toPublicUser(user), accessToken };
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await this.comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.signToken({ sub: user.id, email: user.email });
    return { user: this.toPublicUser(user), accessToken };
  }

  async validateUser(token: string): Promise<PublicUser> {
    const payload = this.decodeToken(token);
    if (!payload) {
      throw new UnauthorizedException("Invalid token");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return this.toPublicUser(user);
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
