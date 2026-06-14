'use client'

import { setCatalogViewAction } from '@/app/(storefront)/_actions'
import { useTransition } from 'react'

type View = 'CARDS' | 'LIST'

export function CatalogToggle({
  current,
  labels,
}: {
  current: View
  labels?: { cards: string; list: string }
}) {
  const [pending, startTransition] = useTransition()

  function switchTo(v: View) {
    startTransition(() => {
      setCatalogViewAction(v)
    })
  }

  const cls = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-[colors,transform] active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100 ${
      active ? 'bg-lime-500 text-gray-900' : 'text-gray-600 hover:text-gray-900'
    }`

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <button
        type="button"
        aria-pressed={current === 'CARDS'}
        onClick={() => switchTo('CARDS')}
        disabled={pending}
        className={cls(current === 'CARDS')}
      >
        {labels?.cards ?? 'Cards'}
      </button>
      <button
        type="button"
        aria-pressed={current === 'LIST'}
        onClick={() => switchTo('LIST')}
        disabled={pending}
        className={cls(current === 'LIST')}
      >
        {labels?.list ?? 'List'}
      </button>
    </div>
  )
}
