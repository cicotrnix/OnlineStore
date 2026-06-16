import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { getLocale } from '@/lib/i18n'
import { AuthBrandPanel } from './AuthBrandPanel'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale({ userId: null })
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.15fr]">
      <AuthBrandPanel locale={locale} />
      <main className="flex flex-col bg-surface">
        <div className="flex justify-end p-4">
          <LocaleSwitch current={locale} />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-2">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  )
}
