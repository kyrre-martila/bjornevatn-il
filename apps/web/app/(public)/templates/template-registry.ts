import {
  coerceTemplateKey,
  TEMPLATE_KEYS,
  type TemplateKey,
} from "../../../lib/templates";
import { IndexTemplate } from "./IndexTemplate";
import { LandingTemplate } from "./LandingTemplate";
import { NewsTemplate } from "./NewsTemplate";
import { ServiceTemplate } from "./ServiceTemplate";

export const VALID_TEMPLATE_KEYS = TEMPLATE_KEYS;

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

export const pageTemplateRegistry: TemplateRegistry = templates;

export const contentTypeTemplateRegistry: TemplateRegistry = templates;

export function resolveTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  return templates[coerceTemplateKey(templateKey)];
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
