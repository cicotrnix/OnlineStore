import { defineTheme } from '@/modules/config'

/**
 * Theme tokens — change visual identity here.
 * Colors, typography, radius and density propagate to all components via CSS variables.
 */
export default defineTheme({
  // PiPower palette.
  // - primary: deep slate. Default surface for buttons + headings (white text OK).
  // - accent: brand lime (#88D810, color de la caja). Brillante — usar como
  //   highlight/borde/badge con texto oscuro, NUNCA como fondo de botón con
  //   texto blanco (contraste WCAG AA insuficiente con #FFFFFF).
  colors: {
    primary: '#1A1F2E',
    accent: '#88D810',
    surface: '#FFFFFF',
    muted: '#F4F7EE',
    danger: '#A32D2D',
  },
  typography: {
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace',
    scale: 'comfortable',
  },
  radius: {
    // "Back to 100%" — cards 16, buttons pill (999), inputs 8 stays.
    card: 16,
    button: 999,
    input: 8,
  },
  density: 'regular',
})
