import { ToastFlashReader } from '@/components/ui/ToastFlashReader'
import { Toaster } from '@/components/ui/Toaster'
import { auth } from '@/lib/auth/config'
import { getLocale } from '@/lib/i18n'
import { themeToCssVars } from '@/lib/theme/apply'
import { getStoreConfig, getStoreTheme } from '@/stores'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: getStoreConfig().identity.name,
  description: `${getStoreConfig().identity.name} · Wholesale store`,
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const locale = await getLocale({ userId: session?.user?.id ?? null })

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: theme tokens are statically generated from the active store's theme config
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeToCssVars(getStoreTheme())} }`,
          }}
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'var(--font-sans)' }}>
        {children}
        <Toaster />
        <ToastFlashReader locale={locale} />
      </body>
    </html>
  )
}
