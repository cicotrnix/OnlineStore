import type { NotificationType } from '@prisma/client'

export interface RenderVars {
  title: string
  body: string
  link: string | null
  userName: string
}

/**
 * Render notification email HTML. Task 2.3 swaps this stub for react-email templates.
 */
export async function renderEmailFor(_type: NotificationType, vars: RenderVars): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const linkBlock = vars.link ? `<p><a href="${appUrl}${vars.link}">Ver detalle</a></p>` : ''
  return `
    <h2>${vars.title}</h2>
    <p>Hola ${vars.userName},</p>
    <p>${vars.body}</p>
    ${linkBlock}
  `
}
