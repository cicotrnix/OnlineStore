/**
 * Clases de botón admin (Back-to-100%): lima primario / secundario / destructivo.
 * Se pasan como `className` a <button> o a <SubmitButton> (que conserva su
 * lógica de pending). No es un componente para no duplicar el manejo de estado.
 */
export const adminBtn = {
  primary:
    'inline-flex items-center justify-center rounded-button bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent/90 disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center rounded-button border border-line px-4 py-2 text-sm font-medium text-ink-700 hover:border-accent hover:text-ink-950 disabled:opacity-50',
  danger:
    'inline-flex items-center justify-center rounded-button border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50',
} as const
