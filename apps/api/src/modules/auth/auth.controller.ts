import {
  Body,
  Controller,
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
import { AuthService, type PublicUser } from "./auth.service";

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
  ) {}

  @Post("register")
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.register(dto, this.extractSessionContext(req));
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
    const result = await this.auth.login(dto, this.extractSessionContext(req));
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

    await this.auth.revokeSessionFromToken(token);
    this.clearAccessCookie(req, res);
    return { success: true };
  }

  private writeAccessCookie(req: Request, res: Response, accessToken: string): void {
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
    if (process.env.NODE_ENV === "production") {
      return true;
    }
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    return req.secure || proto === "https";
  }

  private extractSessionContext(req: Request): { ip?: string | null; userAgent?: string | null } {
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
}
