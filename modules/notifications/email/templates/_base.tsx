import { type Locale, t } from '@/lib/i18n'
import { Body, Container, Head, Heading, Html, Link, Section, Text } from '@react-email/components'
import type { JSX } from 'react'

export interface BaseTemplateProps {
  title: string
  body: string
  link?: string | null
  userName: string
  cta?: string
  /** Locale del destinatario. Default: 'en-US' (chrome en EN). */
  locale?: Locale
}

export function BaseTemplate({
  title,
  body,
  link,
  userName,
  cta,
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
            padding: 32,
            borderRadius: 12,
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <Heading as="h2" style={{ marginTop: 0 }}>
            {title}
          </Heading>
          <Text>{t(locale, 'email.greeting', { name: userName })}</Text>
          <Text style={{ lineHeight: 1.5 }}>{body}</Text>
          {link ? (
            <Section style={{ marginTop: 24 }}>
              <Link
                href={`${appUrl}${link}`}
                style={{
                  background: '#0F6E56',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 500,
                  display: 'inline-block',
                }}
              >
                {ctaText}
              </Link>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}
