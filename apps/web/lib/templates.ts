/**
 * Runtime template contract for public rendering.
 *
 * Keep this list in sync with template registry entries.
 */
export const TEMPLATE_KEYS = ["index", "service", "news", "landing"] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const DEFAULT_TEMPLATE_KEY: TemplateKey = "index";

export function isTemplateKey(value: string): value is TemplateKey {
  return TEMPLATE_KEYS.includes(value as TemplateKey);
}

export function coerceTemplateKey(value: string | null | undefined): TemplateKey {
  if (!value) {
    return DEFAULT_TEMPLATE_KEY;
  }

  return isTemplateKey(value) ? value : DEFAULT_TEMPLATE_KEY;
}
