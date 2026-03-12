import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import type { Request } from "express";
import { UsersService as UsersDomainService } from "@org/domain";

import { AuthService } from "../auth/auth.service";

class UpdateMeDto {
  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, type: String })
  @IsOptional()
  @IsString()
  birthDate?: string; // expect YYYY-MM-DD
}

class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  firstName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  lastName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  birthDate!: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String })
  role!: string;
}

class MeResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

@ApiTags("me")
@Controller("me")
export class UsersController {
  constructor(
    private readonly usersService: UsersDomainService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiCookieAuth("access")
  @ApiOkResponse({ type: MeResponseDto })
  async me(@Req() req: Request): Promise<MeResponseDto> {
    const access =
      (req.cookies?.access as string) ||
      (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!access) throw new UnauthorizedException("Missing token");

    const { payload } = await this.auth.authenticate(access);

    const user = await this.usersService.getProfile(payload.sub);

    const safeUser: UserProfileDto = {
      id: user.id,
      email: user.email,
      phone: user.profile?.phone ?? null,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      birthDate: user.profile?.birthDate
        ? user.profile.birthDate instanceof Date
          ? user.profile.birthDate.toISOString().slice(0, 10)
          : user.profile.birthDate
        : null,
      createdAt:
        user.createdAt instanceof Date
          ? user.createdAt.toISOString()
          : user.createdAt,
      role: user.role,
    };

    return { user: safeUser };
  }

  @Patch()
  @ApiBearerAuth()
  @ApiCookieAuth("access")
  @ApiOkResponse({ type: MeResponseDto })
  async updateMe(
    @Req() req: Request,
    @Body() body: UpdateMeDto,
  ): Promise<MeResponseDto> {
    const access =
      (req.cookies?.access as string) ||
      (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");

    if (!access) throw new UnauthorizedException("Missing token");

    const { payload } = await this.auth.authenticate(access);

    // Call the domain service to update the profile.
    const updated = await this.usersService.updateProfile(payload.sub, {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      birthDate: body.birthDate,
    });

    const safeUser: UserProfileDto = {
      id: updated.id,
      email: updated.email,
      phone: updated.profile?.phone ?? null,
      firstName: updated.profile?.firstName ?? null,
      lastName: updated.profile?.lastName ?? null,
      birthDate: updated.profile?.birthDate
        ? updated.profile.birthDate instanceof Date
          ? updated.profile.birthDate.toISOString().slice(0, 10)
          : updated.profile.birthDate
        : null,
      createdAt:
        updated.createdAt instanceof Date
          ? updated.createdAt.toISOString()
          : updated.createdAt,
      role: updated.role,
    };

    return { user: safeUser };
  }
}
