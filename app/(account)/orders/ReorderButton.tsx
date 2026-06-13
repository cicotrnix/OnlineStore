'use client'

import { toast } from '@/components/ui/Toaster'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { reorderAction } from './_actions'

type Props = { orderId: string; locale: Locale; variant?: 'primary' | 'secondary' }

const STYLES = {
  primary:
    'inline-flex items-center justify-center rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
}

export function ReorderButton({ orderId, locale, variant = 'secondary' }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nothingAvailable, setNothingAvailable] = useState(false)

  function onClick() {
    setNothingAvailable(false)
    startTransition(async () => {
      const res = await reorderAction(orderId)
      if (!res.ok) {
        toast.error(t(locale, res.messageKey as MessageKey))
        return
      }
      // Nada viable → no navega; aviso inline con motivos genéricos.
      if (res.result.added.length === 0) {
        setNothingAvailable(true)
        toast.info(t(locale, 'reorder.notice.nothingAvailable'))
        return
      }
      // Hay items: toast (con aviso de omitidos si los hay) y a revisar en /cart.
      const key: MessageKey =
        res.result.skipped.length > 0 ? 'reorder.toast.addedSomeSkipped' : 'reorder.toast.added'
      toast.success(t(locale, key))
      router.push('/cart')
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={pending} className={STYLES[variant]}>
        {t(locale, 'reorder.button')}
      </button>
      {nothingAvailable && (
        <p className="text-xs text-gray-600 max-w-[14rem] text-right">
          {t(locale, 'reorder.notice.nothingAvailable')}
        </p>
      )}
    </div>
  )
}
