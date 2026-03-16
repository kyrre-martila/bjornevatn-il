import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type {
  ContentFieldDefinition,
  ContentItemsRepository,
  ContentTypesRepository,
  MediaRepository,
  PagesRepository,
} from "@org/domain";

type RelationTarget = "contentType" | "page" | "media";

type RelationConfig = {
  targetType: RelationTarget;
  targetSlug?: string;
  targetModel?: string;
  multiple?: boolean;
};

@Injectable()
export class ContentValidationService {
  constructor(
    @Inject("PagesRepository") private readonly pages: PagesRepository,
    @Inject("ContentTypesRepository")
    private readonly contentTypes: ContentTypesRepository,
    @Inject("ContentItemsRepository")
    private readonly contentItems: ContentItemsRepository,
    @Inject("MediaRepository")
    private readonly media: MediaRepository,
  ) {}

  private extractPageBlockMediaUrls(block: {
    type: string;
    data: Record<string, unknown>;
  }): string[] {
    if (block.type === "image") {
      const src = block.data.src;
      return typeof src === "string" && src.trim() ? [src.trim()] : [];
    }

    if (block.type === "hero") {
      const imageUrl = block.data.imageUrl;
      return typeof imageUrl === "string" && imageUrl.trim()
        ? [imageUrl.trim()]
        : [];
    }

    return [];
  }

  private async getMediaByUrlMap(
    urls: Iterable<string>,
  ): Promise<Map<string, { id: string; alt: string }>> {
    const normalizedUrls = [
      ...new Set([...urls].map((url) => url.trim()).filter(Boolean)),
    ];
    const media = await this.media.findManyByUrls(normalizedUrls);
    return new Map(
      media.map((item) => [item.url, { id: item.id, alt: item.alt }]),
    );
  }

  async validatePageBlocksMediaAlt(
    blocks: Array<{ type: string; data: Record<string, unknown> }>,
  ): Promise<void> {
    const referencedUrls = new Set<string>();

    for (const block of blocks) {
      for (const url of this.extractPageBlockMediaUrls(block)) {
        referencedUrls.add(url);
      }
    }

    const mediaByUrl = await this.getMediaByUrlMap(referencedUrls);

    for (const [index, block] of blocks.entries()) {
      const urls = this.extractPageBlockMediaUrls(block);
      for (const url of urls) {
        const matched = mediaByUrl.get(url);
        if (matched && !matched.alt.trim()) {
          throw new BadRequestException(
            `Page block #${index + 1} (${block.type}) references media without alt text. Update that media item's alt text before saving.`,
          );
        }
      }
    }
  }

  private buildRelationConfig(
    field: ContentFieldDefinition,
  ): RelationConfig | undefined {
    if (
      field.type !== "relation" &&
      field.type !== "contentItem" &&
      field.type !== "media" &&
      field.type !== "page"
    ) {
      return undefined;
    }

    return field.type === "relation"
      ? field.relation
      : {
          targetType:
            field.type === "contentItem"
              ? ("contentType" as const)
              : field.type,
          ...(field.relation?.targetSlug
            ? { targetSlug: field.relation.targetSlug }
            : {}),
          ...(field.relation?.targetModel
            ? { targetModel: field.relation.targetModel }
            : {}),
          ...(field.relation?.multiple ? { multiple: true } : {}),
        };
  }

  async validateContentTypeFields(
    fields: ContentFieldDefinition[],
  ): Promise<void> {
    const relationsByField = new Map<string, RelationConfig>();
    const contentTypeSlugs = new Set<string>();

    for (const field of fields) {
      const relation = this.buildRelationConfig(field);
      if (!relation) {
        continue;
      }

      relationsByField.set(field.key, relation);

      if (relation.targetType === "contentType") {
        const resolvedTarget =
          relation.targetSlug?.trim() || relation.targetModel?.trim();
        if (!resolvedTarget) {
          throw new BadRequestException(
            `Field ${field.key} requires relation.targetSlug or relation.targetModel when targetType is contentType.`,
          );
        }

        contentTypeSlugs.add(resolvedTarget);
      }
    }

    const contentTypes = await this.contentTypes.findManyBySlugs([
      ...contentTypeSlugs,
    ]);
    const contentTypeBySlug = new Map(
      contentTypes.map((contentType) => [contentType.slug, contentType]),
    );

    for (const field of fields) {
      const relation = relationsByField.get(field.key);
      if (!relation || relation.targetType !== "contentType") {
        continue;
      }

      const resolvedTarget =
        relation.targetSlug?.trim() || relation.targetModel?.trim();
      if (resolvedTarget && !contentTypeBySlug.has(resolvedTarget)) {
        throw new BadRequestException(
          `Field ${field.key} references unknown content type slug: ${resolvedTarget}.`,
        );
      }
    }
  }

  async validateContentItemData(
    fields: ContentFieldDefinition[],
    data: Record<string, unknown>,
  ): Promise<void> {
    const normalizeRelationIds = (
      field: ContentFieldDefinition,
      value: unknown,
    ): string[] => {
      const multiple = Boolean(field.relation?.multiple);
      if (multiple) {
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Field ${field.key} must be an array of reference ids.`,
          );
        }
        const ids = value.map((entry) => {
          if (typeof entry !== "string") {
            throw new BadRequestException(
              `Field ${field.key} must contain only string reference ids.`,
            );
          }
          return entry.trim();
        });

        const filtered = ids.filter(Boolean);
        if (field.required && filtered.length === 0) {
          throw new BadRequestException(`Missing required field: ${field.key}`);
        }
        return filtered;
      }

      if (typeof value !== "string") {
        throw new BadRequestException(`Field ${field.key} must be a string.`);
      }

      const normalized = value.trim();
      if (!normalized) {
        if (field.required) {
          throw new BadRequestException(`Missing required field: ${field.key}`);
        }
        return [];
      }

      return [normalized];
    };

    const contentTypeSlugs = new Set<string>();
    const pageIds = new Set<string>();
    const mediaIds = new Set<string>();
    const contentItemIds = new Set<string>();
    const imageUrls = new Set<string>();

    const relationChecks: Array<{
      field: ContentFieldDefinition;
      relation: RelationConfig;
      ids: string[];
      resolvedTarget?: string;
    }> = [];

    for (const field of fields) {
      const value = data[field.key];
      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        throw new BadRequestException(`Missing required field: ${field.key}`);
      }

      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (field.type === "boolean") {
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `Field ${field.key} must be a boolean.`,
          );
        }
        continue;
      }

      if (field.type === "image") {
        if (typeof value !== "string") {
          throw new BadRequestException(`Field ${field.key} must be a string.`);
        }

        const normalized = value.trim();
        if (normalized) {
          imageUrls.add(normalized);
        }
        continue;
      }

      if (
        field.type !== "relation" &&
        field.type !== "media" &&
        field.type !== "contentItem" &&
        field.type !== "page"
      ) {
        if (typeof value !== "string") {
          throw new BadRequestException(`Field ${field.key} must be a string.`);
        }
        continue;
      }

      const relation = this.buildRelationConfig(field);
      if (!relation) {
        throw new BadRequestException(
          `Field ${field.key} requires relation configuration.`,
        );
      }

      const ids = normalizeRelationIds(field, value);
      let resolvedTarget: string | undefined;

      if (relation.targetType === "contentType") {
        resolvedTarget =
          relation.targetSlug?.trim() || relation.targetModel?.trim();
        if (!resolvedTarget) {
          throw new BadRequestException(
            `Field ${field.key} requires relation.targetSlug or relation.targetModel when targetType is contentType.`,
          );
        }
        contentTypeSlugs.add(resolvedTarget);
      }

      for (const refId of ids) {
        if (relation.targetType === "page") {
          pageIds.add(refId);
        } else if (relation.targetType === "media") {
          mediaIds.add(refId);
        } else if (relation.targetType === "contentType") {
          contentItemIds.add(refId);
        }
      }

      relationChecks.push({ field, relation, ids, resolvedTarget });
    }

    const [pages, media, contentItems, targetContentTypes, mediaByUrl] =
      await Promise.all([
        this.pages.findManyByIds([...pageIds]),
        this.media.findManyByIds([...mediaIds]),
        this.contentItems.findManyByIds([...contentItemIds]),
        this.contentTypes.findManyBySlugs([...contentTypeSlugs]),
        this.getMediaByUrlMap(imageUrls),
      ]);

    const pageById = new Map(pages.map((page) => [page.id, page]));
    const mediaById = new Map(media.map((item) => [item.id, item]));
    const contentItemById = new Map(
      contentItems.map((item) => [item.id, item]),
    );
    const contentTypeBySlug = new Map(
      targetContentTypes.map((contentType) => [contentType.slug, contentType]),
    );

    for (const field of fields) {
      if (field.type !== "image") {
        continue;
      }

      const value = data[field.key];
      if (value === undefined || value === null || value === "") {
        continue;
      }

      const normalized = typeof value === "string" ? value.trim() : "";
      if (!normalized) {
        continue;
      }

      const matchedMedia = mediaByUrl.get(normalized);
      if (matchedMedia && !matchedMedia.alt.trim()) {
        throw new BadRequestException(
          `Field ${field.key} references media without alt text. Update that media item before saving.`,
        );
      }
    }

    for (const check of relationChecks) {
      const { field, relation, ids, resolvedTarget } = check;

      for (const refId of ids) {
        if (relation.targetType === "page") {
          if (!pageById.has(refId)) {
            throw new BadRequestException(
              `Field ${field.key} references missing page.`,
            );
          }
          continue;
        }

        if (relation.targetType === "media") {
          const matchedMedia = mediaById.get(refId);
          if (!matchedMedia) {
            throw new BadRequestException(
              `Field ${field.key} references missing media.`,
            );
          }
          if (!matchedMedia.alt.trim()) {
            throw new BadRequestException(
              `Field ${field.key} references media without alt text. Update that media item before saving.`,
            );
          }
          continue;
        }

        if (relation.targetType === "contentType") {
          if (!resolvedTarget) {
            continue;
          }

          const targetContentType = contentTypeBySlug.get(resolvedTarget);
          if (!targetContentType) {
            throw new BadRequestException(
              `Field ${field.key} references unknown content type slug: ${resolvedTarget}.`,
            );
          }

          const referencedItem = contentItemById.get(refId);
          if (
            !referencedItem ||
            referencedItem.contentTypeId !== targetContentType.id
          ) {
            throw new BadRequestException(
              `Field ${field.key} must reference an item from content type: ${resolvedTarget}.`,
            );
          }
        }
      }
    }
  }

  ensureEditorCannotModifyRelationFields(
    role: "editor" | "admin" | "superadmin",
    fields: Array<ContentFieldDefinition>,
    incomingData: Record<string, unknown>,
    existingData: Record<string, unknown> | null,
  ) {
    if (role !== "editor") {
      return;
    }

    const relationFields = fields.filter(
      (field) =>
        field.type === "relation" ||
        field.type === "contentItem" ||
        field.type === "page",
    );

    for (const field of relationFields) {
      const incoming = incomingData[field.key];
      const current = existingData ? existingData[field.key] : undefined;
      if (
        JSON.stringify(incoming ?? null) !== JSON.stringify(current ?? null)
      ) {
        throw new ForbiddenException(
          "Access denied: editors cannot modify relation fields.",
        );
      }
    }
  }
}
