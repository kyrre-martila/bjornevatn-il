import {
  Body,
  Controller,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import type { Request, Response } from "express";

import { readAccessToken } from "../../common/auth/read-access-token";
import { isHardenedEnvironment } from "../../config/runtime-env";
import { AuthService, type PublicUser } from "./auth.service";
import { AuditService } from "../audit/audit.service";

class PublicUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  name!: string | null;

  @ApiProperty()
  role!: string;
}

class AuthResponseDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;
}

class LogoutResponseDto {
  @ApiProperty()
  success!: boolean;
}

class SuccessResponseDto {
  @ApiProperty()
  success!: boolean;
}

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  @Post("register")
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    if (!this.isRegistrationEnabled()) {
      throw new HttpException(
        { error: "Registration is disabled" },
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.auth.register(
      dto,
      this.extractSessionContext(req),
    );
    this.audit.log({
      userId: result.user.id,
      action: "registration",
      entityType: "user",
      entityId: result.user.id,
      metadata: {
        actor: {
          id: result.user.id,
          email: result.user.email,
        },
      },
    });
    this.writeAccessCookie(req, res, result.accessToken);
    return this.toAuthResponse(result.user);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    let result;
    try {
      result = await this.auth.login(dto, this.extractSessionContext(req));
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.audit.log({
          userId: null,
          action: "login_failed",
          entityType: "session",
          entityId: null,
          metadata: {
            actor: {
              email: dto.email.trim().toLowerCase(),
              ip: req.ip,
            },
            reason: "invalid_credentials",
          },
        });
      }
      throw error;
    }

    this.writeAccessCookie(req, res, result.accessToken);
    this.audit.log({
      userId: result.user.id,
      action: "login",
      entityType: "session",
      entityId: result.user.id,
      metadata: { email: result.user.email },
    });
    return this.toAuthResponse(result.user);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SuccessResponseDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.auth.requestPasswordReset(dto);
    return { success: true };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: SuccessResponseDto })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<SuccessResponseDto> {
    await this.auth.resetPassword(dto);
    return { success: true };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const token = readAccessToken(req);
    if (!token) {
      throw new UnauthorizedException("Missing token");
    }

    const result = await this.auth.refreshAccessToken(token);
    this.writeAccessCookie(req, res, result.accessToken);
    return this.toAuthResponse(result.user);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const token = readAccessToken(req);
    if (!token) {
      throw new UnauthorizedException("Missing token");
    }

    const decoded = this.auth.decodeToken(token);
    await this.auth.revokeSessionFromToken(token);
    this.audit.log({
      userId: decoded?.sub ?? null,
      action: "logout",
      entityType: "session",
      entityId: decoded?.sid ?? null,
    });
    this.clearAccessCookie(req, res);
    return { success: true };
  }

  private writeAccessCookie(
    req: Request,
    res: Response,
    accessToken: string,
  ): void {
    const payload = this.auth.decodeToken(accessToken);
    const expires = payload?.exp ? new Date(payload.exp * 1000) : undefined;

    res.cookie("access", accessToken, {
      httpOnly: true,
      secure: this.isSecureRequest(req),
      sameSite: "strict",
      path: "/",
      domain: this.config.get<string>("COOKIE_DOMAIN") ?? undefined,
      expires,
    });
  }

  private clearAccessCookie(req: Request, res: Response): void {
    res.clearCookie("access", {
      httpOnly: true,
      secure: this.isSecureRequest(req),
      sameSite: "strict",
      path: "/",
      domain: this.config.get<string>("COOKIE_DOMAIN") ?? undefined,
    });
  }

  private isSecureRequest(req: Request): boolean {
    if (isHardenedEnvironment()) {
      return true;
    }
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    return req.secure || proto === "https";
  }

  private extractSessionContext(req: Request): {
    ip?: string | null;
    userAgent?: string | null;
  } {
    return {
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    };
  }

  private toAuthResponse(user: PublicUser): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private isRegistrationEnabled(): boolean {
    const registrationEnabled =
      this.config.get<string>("REGISTRATION_ENABLED") === "true";

    if (!registrationEnabled) {
      return false;
    }

    if (!isHardenedEnvironment()) {
      return true;
    }

    return (
      this.config.get<string>("ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV") ===
      "true"
    );
  }
}
