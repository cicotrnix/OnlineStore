import { defineTheme } from '@/modules/config'

/**
 * Theme tokens — change visual identity here.
 * Colors, typography, radius and density propagate to all components via CSS variables.
 */
export default defineTheme({
  // Demo Store palette — visually distinct from pipower (verde primario).
  colors: {
    primary: '#0F6E3E',
    accent: '#F5C518',
    surface: '#FFFFFF',
    muted: '#EEF5F0',
    danger: '#A32D2D',
  },
  typography: {
    sans: 'Inter, system-ui, sans-serif',
    scale: 'comfortable',
  },
  radius: {
    card: 12,
    button: 8,
    input: 8,
  },
  density: 'regular',
})
