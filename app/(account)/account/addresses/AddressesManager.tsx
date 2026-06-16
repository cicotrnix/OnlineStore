'use client'

import { SubmitButton } from '@/components/ui/SubmitButton'
import { toast } from '@/components/ui/Toaster'
import { type ActionResult, INITIAL_ACTION_RESULT } from '@/lib/feedback/action-result'
import { type Locale, type MessageKey, t } from '@/lib/i18n/messages'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import { AddressForm } from './AddressForm'
import { deleteAddressAction, setDefaultBillingAction, setDefaultShippingAction } from './actions'
import type { AddressView } from './types'

type ServerAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>

/** Botón que dispara una server action con id oculto + toast + refresh. */
function ActionButton({
  locale,
  action,
  id,
  className,
  children,
}: {
  locale: Locale
  action: ServerAction
  id: string
  className: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [state, formAction] = useFormState(action, INITIAL_ACTION_RESULT)
  useEffect(() => {
    if (!state.messageKey) return
    const msg = t(locale, state.messageKey as MessageKey, state.vars)
    if (state.ok) {
      toast.success(msg)
      router.refresh()
    } else {
      toast.error(msg)
    }
  }, [state, locale, router])
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="…" variant="secondary" className={className}>
        {children}
      </SubmitButton>
    </form>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-button bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-lime-deep">
      {children}
    </span>
  )
}

function AddressCard({
  locale,
  address,
  canEdit,
  onEdit,
}: {
  locale: Locale
  address: AddressView
  canEdit: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const [delState, delAction] = useFormState(deleteAddressAction, INITIAL_ACTION_RESULT)

  useEffect(() => {
    if (!delState.messageKey) return
    const msg = t(locale, delState.messageKey as MessageKey, delState.vars)
    if (delState.ok) {
      toast.success(msg)
      router.refresh()
    } else {
      toast.error(msg)
      // Falla (p.ej. in-use): cerrá el confirm y devolvé el foco al trigger.
      setConfirming(false)
      deleteTriggerRef.current?.focus()
    }
  }, [delState, locale, router])

  const smallBtn =
    'rounded-button border border-line px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-accent hover:text-ink-950'

  return (
    <div className="flex flex-col rounded-card border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-ink-950">{address.label}</p>
        <div className="flex flex-wrap justify-end gap-1">
          {address.isDefaultBilling && <Badge>{t(locale, 'account.addresses.badgeBilling')}</Badge>}
          {address.isDefaultShipping && (
            <Badge>{t(locale, 'account.addresses.badgeShipping')}</Badge>
          )}
        </div>
      </div>
      <address className="mt-2 space-y-0.5 text-sm not-italic text-ink-500">
        <div className="text-ink-950">{address.recipient}</div>
        <div>{address.line1}</div>
        {address.line2 && <div>{address.line2}</div>}
        <div>
          {address.city}
          {address.state ? `, ${address.state}` : ''} {address.postalCode}
        </div>
        <div className="font-mono text-xs uppercase">{address.country}</div>
        {address.phone && <div className="font-mono text-xs">{address.phone}</div>}
      </address>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <button type="button" onClick={onEdit} className={smallBtn}>
            {t(locale, 'account.addresses.edit')}
          </button>
          {!address.isDefaultBilling && (
            <ActionButton
              locale={locale}
              action={setDefaultBillingAction}
              id={address.id}
              className={smallBtn}
            >
              {t(locale, 'account.addresses.setDefaultBilling')}
            </ActionButton>
          )}
          {!address.isDefaultShipping && (
            <ActionButton
              locale={locale}
              action={setDefaultShippingAction}
              id={address.id}
              className={smallBtn}
            >
              {t(locale, 'account.addresses.setDefaultShipping')}
            </ActionButton>
          )}
          {confirming ? (
            <form action={delAction} className="flex items-center gap-2" role="group">
              <input type="hidden" name="id" value={address.id} />
              <span className="text-xs text-ink-700">
                {t(locale, 'account.addresses.confirmDelete')}
              </span>
              {/* autoFocus: el foco va al confirmar; al cancelar vuelve al trigger. */}
              <button
                type="submit"
                // biome-ignore lint/a11y/noAutofocus: foco intencional en confirmación destructiva
                autoFocus
                className="rounded-button bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                {t(locale, 'account.addresses.delete')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  deleteTriggerRef.current?.focus()
                }}
                className={smallBtn}
              >
                {t(locale, 'account.addresses.cancel')}
              </button>
            </form>
          ) : (
            <button
              type="button"
              ref={deleteTriggerRef}
              onClick={() => setConfirming(true)}
              className="rounded-button border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              {t(locale, 'account.addresses.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function AddressesManager({
  locale,
  addresses,
  canEdit,
}: {
  locale: Locale
  addresses: AddressView[]
  canEdit: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {!canEdit && (
        <p className="text-sm text-ink-500">{t(locale, 'account.addresses.readOnly')}</p>
      )}

      {canEdit && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-button bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent/90"
        >
          {t(locale, 'account.addresses.add')}
        </button>
      )}

      {adding && <AddressForm locale={locale} onDone={() => setAdding(false)} />}

      {addresses.length === 0 && !adding && (
        <p className="text-sm text-ink-500">{t(locale, 'account.addresses.empty')}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) =>
          editingId === a.id ? (
            <AddressForm key={a.id} locale={locale} address={a} onDone={() => setEditingId(null)} />
          ) : (
            <AddressCard
              key={a.id}
              locale={locale}
              address={a}
              canEdit={canEdit}
              onEdit={() => setEditingId(a.id)}
            />
          )
        )}
      </div>
    </div>
  )
}
