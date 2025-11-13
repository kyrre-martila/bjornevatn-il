export const tokens = {
  color: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',

    accent: 'var(--color-accent)',
    accentSoft: 'var(--color-accent-soft)',
    accentContrast: 'var(--color-accent-contrast)',

    base: 'var(--color-base)',
    baseMuted: 'var(--color-base-muted)',

    neutral: 'var(--color-neutral)',
    neutralSoft: 'var(--color-neutral-soft)',

    neutral0: 'var(--color-neutral-0)',
    neutral50: 'var(--color-neutral-50)',
    neutral100: 'var(--color-neutral-100)',
    neutral200: 'var(--color-neutral-200)',
    neutral400: 'var(--color-neutral-400)',
    neutral600: 'var(--color-neutral-600)',
    neutral900: 'var(--color-neutral-900)',

    borderSubtle: 'var(--color-border-subtle)',
    borderStrong: 'var(--color-border-strong)',
  },
  space: {
    xs: 'var(--space-xs)',
    s: 'var(--space-s)',
    m: 'var(--space-m)',
    l: 'var(--space-l)',
    xl: 'var(--space-xl)',
    xxl: 'var(--space-2xl)',
  },
  radius: {
    s: 'var(--radius-s)',
    m: 'var(--radius-m)',
    l: 'var(--radius-l)',
    pill: 'var(--radius-pill)',
  },
  shadow: {
    1: 'var(--shadow-1)',
    2: 'var(--shadow-2)',
  },
  text: {
    xs: 'var(--text-xs)',
    s: 'var(--text-s)',
    m: 'var(--text-m)',
    l: 'var(--text-l)',
    xl: 'var(--text-xl)',
    xxl: 'var(--text-2xl)',
  },
  font: {
    sans: 'var(--font-sans)',
  },
} as const;

export type Tokens = typeof tokens;
