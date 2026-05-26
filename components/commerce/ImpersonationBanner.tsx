import { impersonationStop } from '@/lib/auth/actions'

type Props = {
  orgName: string
}

export function ImpersonationBanner({ orgName }: Props) {
  return (
    <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-sm flex items-center justify-between">
      <span className="text-amber-900">
        Viendo como <strong>{orgName}</strong>. No puedes colocar órdenes mientras impersonas.
      </span>
      <form action={impersonationStop}>
        <button
          type="submit"
          className="rounded border border-amber-700 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
        >
          Salir
        </button>
      </form>
    </div>
  )
}
