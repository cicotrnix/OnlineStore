'use client'

import { setLocaleAction } from '@/app/(storefront)/_actions'
import { LOCALES, type Locale, t } from '@/lib/i18n/messages'

export function LocaleSwitch({ current }: { current: Locale }) {
  return (
    <form action={setLocaleAction} className="flex items-center gap-2 text-sm">
      <label htmlFor="locale-select" className="sr-only">
        {t(current, 'localeSwitch.label')}
      </label>
      <select
        id="locale-select"
        name="locale"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
        aria-label={t(current, 'localeSwitch.label')}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {l === 'en-US' ? t(current, 'localeSwitch.en') : t(current, 'localeSwitch.es')}
          </option>
        ))}
      </select>
    </form>
  )
}
