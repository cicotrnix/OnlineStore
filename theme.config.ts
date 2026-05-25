import { defineTheme } from './modules/config'

/**
 * Theme tokens — change visual identity here.
 * Colors, typography, radius and density propagate to all components via CSS variables.
 */
export default defineTheme({
  colors: {
    primary: '#0F6E56',
    accent: '#534AB7',
    surface: '#FFFFFF',
    muted: '#F1EFE8',
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
