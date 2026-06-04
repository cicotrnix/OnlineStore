'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Toaster global app-wide. Montado una sola vez en el root layout.
 * Posición top-right, duración 4s.
 */
export function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton duration={4000} />
}

export { toast } from 'sonner'
