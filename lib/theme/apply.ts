import type { ThemeConfig } from '@/modules/config'

/**
 * Convert a ThemeConfig into a string of CSS custom properties.
 * The result is injected as inline CSS in the root <html> element.
 */
export function themeToCssVars(theme: ThemeConfig): string {
  return [
    `--color-primary: ${theme.colors.primary};`,
    `--color-accent: ${theme.colors.accent};`,
    `--color-surface: ${theme.colors.surface};`,
    `--color-muted: ${theme.colors.muted};`,
    `--color-danger: ${theme.colors.danger};`,
    `--font-sans: ${theme.typography.sans};`,
    `--radius-card: ${theme.radius.card}px;`,
    `--radius-button: ${theme.radius.button}px;`,
    `--radius-input: ${theme.radius.input}px;`,
  ].join(' ')
}
