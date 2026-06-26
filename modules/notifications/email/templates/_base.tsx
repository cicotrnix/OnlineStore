import { type Locale, t } from '@/lib/i18n'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components'
// Runtime React binding: el JSX se transforma al runtime clásico
// (React.createElement) en el contexto del cron (pnpm tsx/esbuild). Sin este
// import → "React is not defined" al renderizar. import type no alcanza.
// biome-ignore lint/correctness/noUnusedImports: binding de runtime del transform clásico — el render lo usa aunque no se referencie explícito (biome asume runtime automático).
import * as React from 'react'
import type { JSX } from 'react'

// Colores fijos de marca (el email no adapta dark mode).
const SLATE = '#1A1F2E'
const LIMA = '#88D810'
const GRAY = '#5f6672'
const GRAY2 = '#8a909c'
const GRAY3 = '#9aa3b2'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const LOGO_URL = 'https://pipower.shop/logo-pipower-light.png'

export interface ReceiptData {
  /** Nº de factura (IN-…). */
  invoiceNumber: string
  /** Fecha del pago, ya formateada. */
  dateFormatted: string
  /** Método de pago, ej. "Tarjeta". */
  method: string
  /** Total ya formateado con símbolo, ej. "$50.00". */
  totalFormatted: string
}

export interface BaseTemplateProps {
  title: string
  body: string
  link?: string | null
  userName: string
  cta?: string
  /** CTA secundario opcional (botón outline). P.ej. "Volver a pedir". */
  secondaryCta?: string
  secondaryLink?: string | null
  /** Bloque recibo (PAYMENT_CAPTURED consolidado). Si está, se renderiza. */
  receipt?: ReceiptData
  /** Locale del destinatario. Default: 'en-US' (chrome en EN). */
  locale?: Locale
}

function ReceiptBlock({ receipt }: { receipt: ReceiptData }): JSX.Element {
  return (
    <Section
      style={{
        border: '0.5px solid #d9dce1',
        borderRadius: 10,
        padding: 20,
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      <Text style={{ margin: 0, fontSize: 13, color: GRAY2 }}>
        Factura <span style={{ fontFamily: MONO, color: SLATE }}>{receipt.invoiceNumber}</span>
      </Text>
      <Text style={{ margin: '6px 0 0', fontSize: 13, color: GRAY2 }}>
        Fecha {receipt.dateFormatted} · Método {receipt.method}
      </Text>
      <Section style={{ marginTop: 16, borderTop: '1px solid #eef0f3', paddingTop: 12 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: SLATE }}>
          {receipt.totalFormatted}
        </span>
        <span
          style={{
            background: '#eaf3de',
            color: '#3b6d11',
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginLeft: 12,
          }}
        >
          Pagado
        </span>
      </Section>
    </Section>
  )
}

export function BaseTemplate({
  title,
  body,
  link,
  userName,
  cta,
  secondaryCta,
  secondaryLink,
  receipt,
  locale = 'en-US',
}: BaseTemplateProps): JSX.Element {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ''
  const ctaText = cta ?? t(locale, 'email.cta.viewDetail')
  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
          background: '#f5f5f5',
          margin: 0,
        }}
      >
        <Container
          style={{
            background: 'white',
            borderRadius: 12,
            maxWidth: 600,
            margin: '0 auto',
            overflow: 'hidden',
          }}
        >
          {/* Header de marca: barra slate + logo + acento lima */}
          <Section style={{ background: SLATE, padding: '16px 24px' }}>
            <Img src={LOGO_URL} height={22} alt="PiPower" style={{ display: 'block' }} />
          </Section>
          <Section style={{ height: 3, background: LIMA, fontSize: 0, lineHeight: '3px' }}>
            &nbsp;
          </Section>

          {/* Contenido */}
          <Section style={{ padding: 32 }}>
            <Heading as="h2" style={{ marginTop: 0, color: SLATE }}>
              {title}
            </Heading>
            <Text style={{ color: SLATE }}>{t(locale, 'email.greeting', { name: userName })}</Text>
            <Text style={{ lineHeight: 1.5, color: GRAY }}>{body}</Text>
            {receipt ? <ReceiptBlock receipt={receipt} /> : null}
            {link ? (
              <Section style={{ marginTop: 24 }}>
                <Link
                  href={`${appUrl}${link}`}
                  style={{
                    background: LIMA,
                    color: SLATE,
                    padding: '12px 22px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 600,
                    display: 'inline-block',
                  }}
                >
                  {ctaText}
                </Link>
                {secondaryCta && secondaryLink ? (
                  <Link
                    href={`${appUrl}${secondaryLink}`}
                    style={{
                      border: `1px solid ${SLATE}`,
                      color: SLATE,
                      padding: '11px 20px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontWeight: 500,
                      display: 'inline-block',
                      marginLeft: 12,
                    }}
                  >
                    {secondaryCta}
                  </Link>
                ) : null}
              </Section>
            ) : null}
          </Section>

          {/* Footer: marca + disclaimer aftermarket */}
          <Section
            style={{ background: '#f0f1f3', padding: '20px 24px', borderTop: '1px solid #e5e7eb' }}
          >
            <Text style={{ margin: 0, fontSize: 12, color: GRAY2 }}>PiPower · pipower.shop</Text>
            <Text style={{ margin: '8px 0 0', fontSize: 11, color: GRAY3, lineHeight: 1.5 }}>
              Producto aftermarket, no afiliado ni respaldado por Apple Inc.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
