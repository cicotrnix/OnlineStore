import { themeToCssVars } from '@/lib/theme/apply'
import storeConfig from '@/store.config'
import themeConfig from '@/theme.config'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: storeConfig.identity.name,
  description: `${storeConfig.identity.name} · Wholesale store`,
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={storeConfig.locale.default}>
      <head>
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: theme tokens are statically generated from theme.config.ts
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeToCssVars(themeConfig)} }`,
          }}
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'var(--font-sans)' }}>
        {children}
      </body>
    </html>
  )
}
