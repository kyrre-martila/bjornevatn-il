import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import type { Request } from "express";

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

  @ApiProperty()
  accessToken!: string;
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
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    const result = await this.auth.register(dto, this.extractSessionContext(req));
    return this.toAuthResponse(result.user, result.accessToken);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const result = await this.auth.login(dto, this.extractSessionContext(req));
    return this.toAuthResponse(result.user, result.accessToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(@Req() req: Request): Promise<LogoutResponseDto> {
    const token =
      (req.cookies?.access as string | undefined) ??
      req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new UnauthorizedException("Missing token");
    }

    await this.auth.revokeSessionFromToken(token);
    return { success: true };
  }

  private extractSessionContext(req: Request): { ip?: string | null; userAgent?: string | null } {
    return {
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
    };
  }

  private toAuthResponse(user: PublicUser, accessToken: string): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    };
  }
}
