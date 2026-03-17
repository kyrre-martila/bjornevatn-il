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

const TEAM_MAIN_CATEGORIES = new Set(["aldersbestemt", "senior"]);
const TEAM_GENDERS = new Set(["gutter", "jenter", "herrer", "kvinner"]);
const TEAM_LEVELS = new Set(["rekrutt", "a-lag"]);
const TEAM_STATUSES = new Set(["active", "inactive", "archived"]);
const PERSON_ROLE_CATEGORIES = new Set([
  "styret",
  "trenere",
  "andre-roller",
  "utvalg",
]);
const SPONSOR_TYPES = new Set([
  "generalsponsor",
  "hovedsponsor",
  "sponsor",
  "samarbeidspartner",
]);
const SPONSOR_STATUSES = new Set(["active", "inactive"]);
const NEWS_CATEGORIES = new Set([
  "club-news",
  "match-report",
  "events",
  "youth",
  "announcements",
]);
const FUNDING_GRANT_CATEGORIES = new Set([
  "tippemidler",
  "other-support",
  "facility-upgrade",
  "community-support",
]);

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
  ): Promise<Map<string, { id: string; altText: string | null }>> {
    const normalizedUrls = [
      ...new Set([...urls].map((url) => url.trim()).filter(Boolean)),
    ];
    const media = await this.media.findManyByUrls(normalizedUrls);
    return new Map(
      media.map((item) => [item.url, { id: item.id, altText: item.altText }]),
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
        if (matched && !(matched.altText ?? "").trim()) {
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
    contentTypeSlug?: string,
    contentItemId?: string,
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
      if (matchedMedia && !(matchedMedia.altText ?? "").trim()) {
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
          if (!(matchedMedia.altText ?? "").trim()) {
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

    await this.validateBlueprintSpecificData(
      contentTypeSlug,
      data,
      contentItemId,
    );
  }

  private async ensureOptionalUniqueFieldValue(params: {
    contentTypeSlug: string;
    fieldKey: string;
    data: Record<string, unknown>;
    currentContentItemId?: string;
  }) {
    const { contentTypeSlug, fieldKey, data, currentContentItemId } = params;
    const value = data[fieldKey];

    if (value === undefined || value === null || value === "") {
      return;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`Field ${fieldKey} must be a string.`);
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return;
    }

    const existingItems =
      await this.contentItems.findManyByContentTypeSlug(contentTypeSlug);

    const duplicate = existingItems.find((item) => {
      if (currentContentItemId && item.id === currentContentItemId) {
        return false;
      }

      const itemData =
        item.data && typeof item.data === "object"
          ? (item.data as Record<string, unknown>)
          : {};
      return itemData[fieldKey] === normalizedValue;
    });

    if (duplicate) {
      throw new BadRequestException(
        `Field ${fieldKey} must be unique within content type ${contentTypeSlug}.`,
      );
    }
  }

  private ensureEnumValue(params: {
    contentTypeSlug: string;
    fieldKey: string;
    value: unknown;
    allowedValues: Set<string>;
    optional?: boolean;
  }) {
    const { contentTypeSlug, fieldKey, value, allowedValues, optional } =
      params;

    if (value === undefined || value === null || value === "") {
      if (optional) {
        return;
      }

      throw new BadRequestException(`Missing required field: ${fieldKey}`);
    }

    if (typeof value !== "string") {
      throw new BadRequestException(
        `Field ${fieldKey} must be a string for content type ${contentTypeSlug}.`,
      );
    }

    const normalizedValue = value.trim();
    if (!allowedValues.has(normalizedValue)) {
      throw new BadRequestException(
        `Field ${fieldKey} has invalid value "${normalizedValue}". Allowed values: ${[...allowedValues].join(", ")}.`,
      );
    }
  }

  private ensureJsonArrayField(
    data: Record<string, unknown>,
    fieldKey: string,
  ): Array<Record<string, unknown>> {
    const value = data[fieldKey];
    if (value === undefined || value === null || value === "") {
      return [];
    }

    if (typeof value !== "string") {
      throw new BadRequestException(`Field ${fieldKey} must be a JSON string.`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException(
        `Field ${fieldKey} must be valid JSON array text.`,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(`Field ${fieldKey} must be a JSON array.`);
    }

    const records = parsed.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
    );

    if (records.length !== parsed.length) {
      throw new BadRequestException(
        `Field ${fieldKey} must contain only objects in the JSON array.`,
      );
    }

    return records;
  }

  private ensureStringProperty(
    entry: Record<string, unknown>,
    fieldKey: string,
    propertyKey: string,
    required = true,
  ) {
    const value = entry[propertyKey];
    if (value === undefined || value === null || value === "") {
      if (!required) {
        return;
      }
      throw new BadRequestException(
        `Field ${fieldKey} entries require property ${propertyKey}.`,
      );
    }

    if (typeof value !== "string") {
      throw new BadRequestException(
        `Field ${fieldKey}.${propertyKey} must be a string.`,
      );
    }
  }

  private ensureSortOrderProperty(
    entry: Record<string, unknown>,
    fieldKey: string,
  ) {
    const sortOrder = entry.sortOrder;
    if (sortOrder === undefined || sortOrder === null || sortOrder === "") {
      return;
    }

    if (typeof sortOrder !== "number" && typeof sortOrder !== "string") {
      throw new BadRequestException(
        `Field ${fieldKey}.sortOrder must be a number or numeric string.`,
      );
    }
  }

  private async validateBlueprintSpecificData(
    contentTypeSlug: string | undefined,
    data: Record<string, unknown>,
    contentItemId?: string,
  ) {
    if (!contentTypeSlug) {
      return;
    }

    if (contentTypeSlug === "team") {
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "mainCategory",
        value: data.mainCategory,
        allowedValues: TEAM_MAIN_CATEGORIES,
      });
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "gender",
        value: data.gender,
        allowedValues: TEAM_GENDERS,
      });
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "teamLevel",
        value: data.teamLevel,
        allowedValues: TEAM_LEVELS,
        optional: true,
      });
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "status",
        value: data.status,
        allowedValues: TEAM_STATUSES,
      });

      for (const fieldKey of ["coaches", "trainingSessions", "socialLinks"]) {
        const entries = this.ensureJsonArrayField(data, fieldKey);

        if (fieldKey === "coaches") {
          for (const entry of entries) {
            this.ensureStringProperty(entry, fieldKey, "name");
            this.ensureStringProperty(entry, fieldKey, "role");
            this.ensureStringProperty(entry, fieldKey, "phone", false);
            this.ensureStringProperty(entry, fieldKey, "email", false);
            this.ensureStringProperty(entry, fieldKey, "image", false);
            this.ensureSortOrderProperty(entry, fieldKey);
          }
        }

        if (fieldKey === "trainingSessions") {
          for (const entry of entries) {
            this.ensureStringProperty(entry, fieldKey, "dayOfWeek");
            this.ensureStringProperty(entry, fieldKey, "startTime");
            this.ensureStringProperty(entry, fieldKey, "endTime");
            this.ensureStringProperty(entry, fieldKey, "location", false);
            this.ensureStringProperty(entry, fieldKey, "notes", false);
            this.ensureSortOrderProperty(entry, fieldKey);
          }
        }

        if (fieldKey === "socialLinks") {
          for (const entry of entries) {
            this.ensureStringProperty(entry, fieldKey, "platform");
            this.ensureStringProperty(entry, fieldKey, "url");
            this.ensureSortOrderProperty(entry, fieldKey);
          }
        }
      }
    }

    if (contentTypeSlug === "club") {
      const socialLinks = this.ensureJsonArrayField(data, "socialLinks");
      for (const entry of socialLinks) {
        this.ensureStringProperty(entry, "socialLinks", "platform");
        this.ensureStringProperty(entry, "socialLinks", "url");
        this.ensureSortOrderProperty(entry, "socialLinks");
      }
    }

    if (contentTypeSlug === "person-role") {
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "category",
        value: data.category,
        allowedValues: PERSON_ROLE_CATEGORIES,
      });
    }

    if (contentTypeSlug === "sponsor") {
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "type",
        value: data.type,
        allowedValues: SPONSOR_TYPES,
      });
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "status",
        value: data.status,
        allowedValues: SPONSOR_STATUSES,
      });
    }

    if (contentTypeSlug === "news") {
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "category",
        value: data.category,
        allowedValues: NEWS_CATEGORIES,
      });
    }

    if (contentTypeSlug === "funding-grant") {
      this.ensureEnumValue({
        contentTypeSlug,
        fieldKey: "category",
        value: data.category,
        allowedValues: FUNDING_GRANT_CATEGORIES,
      });
    }

    if (contentTypeSlug === "match") {
      await this.ensureOptionalUniqueFieldValue({
        contentTypeSlug,
        fieldKey: "externalId",
        data,
        currentContentItemId: contentItemId,
      });
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
