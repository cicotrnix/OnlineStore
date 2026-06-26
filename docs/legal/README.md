# Páginas legales — borradores

> **⚠️ NO SON ASESORÍA LEGAL.** Son borradores de trabajo para que un abogado en USA los revise y adapte antes de publicar. Cubren venta **B2B mayorista** de baterías de litio **aftermarket** (no afiliadas a Apple), pago **wire/ACH**, envío **hazmat** y compradores **revendedores con exención fiscal**. Hay placeholders en `[CORCHETES]` que tenés que completar (entidad legal, estado, contacto, plazos de garantía).

## Archivos

- `terms-of-service.md` — términos de venta B2B, aceptación de orden, pago, título/riesgo, garantía limitada, limitación de responsabilidad, IP.
- `privacy-policy.md` — datos recolectados, procesadores (Stripe, Resend, Anthropic, etc.), derechos CCPA/CPRA, cookies.
- `refund-return-policy.md` — RMA, defectuosos vs. arrepentimiento, restricciones de devolución de litio, restocking.
- `shipping-policy.md` — FedEx Ground, litio Clase 9, handling, export vía forwarder de Miami, FOB.

## Cómo se publican (tarea de CC)

Cada `.md` se wirea como ruta en `app/(storefront)/legal/<slug>/page.tsx` (o el patrón que prefieras), enlazadas desde el footer. El contenido puede ir como markdown renderizado (ya tenés `MarkdownContent` dep-free del PDP). Versión bilingüe (en-US / es-419) usando el patrón i18n existente.

## Placeholders a completar antes de publicar

- `[ENTIDAD LEGAL]` — razón social (LLC/Corp) y estado de constitución.
- `[ESTADO]` — estado cuya ley rige (governing law) y jurisdicción de disputas.
- `[EMAIL LEGAL]` / `[EMAIL PRIVACIDAD]` / `[DIRECCIÓN]` — contactos.
- `[N] meses` de garantía — **debe coincidir** con el documento de garantía del fabricante (ver `docs/sources/claims-map.md`).
- Confirmar con abogado: nexus fiscal por estado, validez de certificados de reventa, requisitos hazmat del carrier.
