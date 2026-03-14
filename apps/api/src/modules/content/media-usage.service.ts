import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MediaUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsedUrls(candidateUrls: string[]): Promise<Set<string>> {
    const urls = candidateUrls
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      return new Set<string>();
    }

    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT DISTINCT refs.url
      FROM (
        SELECT TRIM(pb.data->>'src') AS url
        FROM "PageBlock" pb
        WHERE pb.type = 'image'
          AND pb.data->>'src' = ANY($1::text[])

        UNION

        SELECT TRIM(pb.data->>'imageUrl') AS url
        FROM "PageBlock" pb
        WHERE pb.type = 'hero'
          AND pb.data->>'imageUrl' = ANY($1::text[])

        UNION

        SELECT TRIM(ci.data->>(field->>'key')) AS url
        FROM "ContentItem" ci
        JOIN "ContentType" ct ON ct.id = ci."contentTypeId"
        CROSS JOIN LATERAL jsonb_array_elements(ct.fields) AS field
        WHERE field->>'type' = 'image'
          AND ci.data->>(field->>'key') = ANY($1::text[])
      ) refs
      WHERE refs.url IS NOT NULL
        AND refs.url <> ''
    `,
      urls,
    )) as Array<{ url: string }>;

    return new Set(rows.map((row: { url: string }) => row.url));
  }

  async isMediaUrlUsed(url: string): Promise<boolean> {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return false;
    }

    const used = await this.getUsedUrls([normalizedUrl]);
    return used.has(normalizedUrl);
  }
}
