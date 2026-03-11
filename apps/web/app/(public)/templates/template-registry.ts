import { IndexTemplate } from "./IndexTemplate";
import { LandingTemplate } from "./LandingTemplate";
import { NewsTemplate } from "./NewsTemplate";
import { ServiceTemplate } from "./ServiceTemplate";

export type TemplateKey = "index" | "service" | "news" | "landing";

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

export function resolvePageTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  if (!templateKey) {
    return templates.index;
  }

  return templates[templateKey as TemplateKey] ?? templates.index;
}

export function resolveContentTypeTemplate(
  templateKey: string | null | undefined,
): TemplateComponent {
  if (!templateKey) {
    return templates.index;
  }

  return templates[templateKey as TemplateKey] ?? templates.index;
}
