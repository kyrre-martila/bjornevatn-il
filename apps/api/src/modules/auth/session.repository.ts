import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

type CreateSessionInput = {
  userId: string;
  token: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
};

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSessionInput) {
    return this.prisma.session.create({ data: input });
  }

  findByToken(token: string) {
    return this.prisma.session.findUnique({ where: { token } });
  }

  revoke(token: string, revokedAt: Date) {
    return this.prisma.session.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt },
    });
  }

  extend(token: string, expiresAt: Date) {
    return this.prisma.session.updateMany({
      where: { token, revokedAt: null },
      data: { expiresAt },
    });
  }
}
