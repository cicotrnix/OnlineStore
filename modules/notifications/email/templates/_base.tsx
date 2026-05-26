import { Body, Container, Head, Heading, Html, Link, Section, Text } from '@react-email/components'
import type { JSX } from 'react'

export interface BaseTemplateProps {
  title: string
  body: string
  link?: string | null
  userName: string
  cta?: string
}

export function BaseTemplate({
  title,
  body,
  link,
  userName,
  cta = 'Ver detalle',
}: BaseTemplateProps): JSX.Element {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
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
          <Text>Hola {userName},</Text>
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
                {cta}
              </Link>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}
