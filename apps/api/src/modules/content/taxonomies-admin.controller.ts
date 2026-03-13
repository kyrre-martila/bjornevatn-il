import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Patch,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";
import type {
  ContentItemTermsRepository,
  ContentItemsRepository,
  TaxonomiesRepository,
  TermsRepository,
} from "@org/domain";
import { AuthService } from "../auth/auth.service";
import {
  requireMinimumRole,
  requireSuperAdmin,
} from "../../common/auth/admin-access";
import type { Request } from "express";

class CreateTaxonomyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

class UpdateTaxonomyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

class CreateTermDto {
  @ApiProperty()
  @IsString()
  taxonomyId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpdateTermDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxonomyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class AssignTermsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  termIds!: string[];
}

class ListTermsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxonomyId?: string;
}

@ApiTags("content")
@Controller("admin/content")
export class TaxonomiesAdminController {
  constructor(
    @Inject("TaxonomiesRepository")
    private readonly taxonomies: TaxonomiesRepository,
    @Inject("TermsRepository")
    private readonly terms: TermsRepository,
    @Inject("ContentItemTermsRepository")
    private readonly contentItemTerms: ContentItemTermsRepository,
    @Inject("ContentItemsRepository")
    private readonly contentItems: ContentItemsRepository,
    private readonly auth: AuthService,
  ) {}

  @Get("taxonomies")
  async listTaxonomies(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.taxonomies.findMany();
  }

  @Get("taxonomies/:id")
  async getTaxonomy(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.taxonomies.findById(id);
  }

  @Post("taxonomies")
  async createTaxonomy(@Req() req: Request, @Body() body: CreateTaxonomyDto) {
    await requireSuperAdmin(req, this.auth);
    return this.taxonomies.create(body);
  }

  @Patch("taxonomies/:id")
  async updateTaxonomy(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateTaxonomyDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    return this.taxonomies.update(id, body);
  }

  @Delete("taxonomies/:id")
  async deleteTaxonomy(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
    await this.taxonomies.delete(id);
    return { ok: true };
  }

  @Get("terms")
  async listTerms(@Req() req: Request, @Query() query: ListTermsQueryDto) {
    await requireMinimumRole(req, this.auth, "admin");
    if (query.taxonomyId) {
      return this.terms.findManyByTaxonomyId(query.taxonomyId);
    }

    return this.terms.findMany();
  }

  @Get("terms/:id")
  async getTerm(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.terms.findById(id);
  }

  @Post("terms")
  async createTerm(@Req() req: Request, @Body() body: CreateTermDto) {
    await requireSuperAdmin(req, this.auth);
    return this.terms.create({ ...body, parentId: body.parentId ?? null });
  }

  @Patch("terms/:id")
  async updateTerm(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateTermDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    return this.terms.update(id, body);
  }

  @Delete("terms/:id")
  async deleteTerm(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
    await this.terms.delete(id);
    return { ok: true };
  }

  @Get("items/:id/terms")
  async listContentItemTerms(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    const assignments = await this.contentItemTerms.findManyByContentItemId(id);
    const terms = await this.terms.findManyByIds(
      assignments.map((entry) => entry.termId),
    );
    const termsById = new Map(terms.map((term) => [term.id, term]));

    return assignments.flatMap((entry) => {
      const term = termsById.get(entry.termId);
      return term ? [term] : [];
    });
  }

  @Put("items/:id/terms")
  async assignContentItemTerms(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: AssignTermsDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    const item = await this.contentItems.findById(id);
    if (!item) {
      throw new BadRequestException("Content item not found.");
    }

    return this.contentItemTerms.assign(id, body.termIds);
  }

  @Delete("items/:id/terms/:termId")
  async removeContentItemTerm(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("termId") termId: string,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    await this.contentItemTerms.remove(id, termId);
    return { ok: true };
  }
}
