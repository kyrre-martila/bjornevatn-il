import { IndexTemplate } from "./IndexTemplate";
import { LandingTemplate } from "./LandingTemplate";
import { NewsTemplate } from "./NewsTemplate";
import { ServiceTemplate } from "./ServiceTemplate";

export const VALID_TEMPLATE_KEYS = [
  "index",
  "service",
  "news",
  "landing",
] as const;

export type TemplateKey = (typeof VALID_TEMPLATE_KEYS)[number];

type TemplateComponent = typeof IndexTemplate;
type TemplateRegistry = Record<TemplateKey, TemplateComponent>;

/**
 * Central template registry for public rendering.
 *
 * A template is a complete page component that can include its own header,
 * main content, and footer.
 */
const templates: TemplateRegistry = {
  index: IndexTemplate,
  service: ServiceTemplate,
  news: NewsTemplate,
  landing: LandingTemplate,
};

const INDEX_TEMPLATE_KEY: TemplateKey = "index";

function isTemplateKey(value: string): value is TemplateKey {
  return VALID_TEMPLATE_KEYS.includes(value as TemplateKey);
}

export const pageTemplateRegistry: TemplateRegistry = templates;

export const contentTypeTemplateRegistry: TemplateRegistry = templates;

export function resolveTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  if (!templateKey) {
    return templates[INDEX_TEMPLATE_KEY];
  }

  return isTemplateKey(templateKey)
    ? templates[templateKey]
    : templates[INDEX_TEMPLATE_KEY];
}

export function resolvePageTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  return resolveTemplate(templateKey);
}

export function resolveContentTypeTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  return resolveTemplate(templateKey);
}
