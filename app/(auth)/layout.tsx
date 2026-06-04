import { LocaleSwitch } from '@/components/commerce/LocaleSwitch'
import { getLocale } from '@/lib/i18n'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale({ userId: null })
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 p-6">
      <div className="flex justify-end max-w-md w-full mx-auto">
        <LocaleSwitch current={locale} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border rounded-xl p-8 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
