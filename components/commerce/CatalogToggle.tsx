'use client'

import { setCatalogViewAction } from '@/app/(storefront)/_actions'
import { Button } from '@/components/ui/Button'
import { useTransition } from 'react'

type View = 'CARDS' | 'LIST'

export function CatalogToggle({ current }: { current: View }) {
  const [pending, startTransition] = useTransition()

  function switchTo(v: View) {
    startTransition(() => {
      setCatalogViewAction(v)
    })
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <Button
        type="button"
        variant={current === 'CARDS' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => switchTo('CARDS')}
        disabled={pending}
      >
        Cards
      </Button>
      <Button
        type="button"
        variant={current === 'LIST' ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => switchTo('LIST')}
        disabled={pending}
      >
        Lista
      </Button>
    </div>
  )
}
