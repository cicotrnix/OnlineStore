import { auth, signIn } from '@/lib/auth'
import storeConfig from '@/store.config'
import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ check?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams
  const checkInbox = params.check === 'email'

  if (!checkInbox) {
    const session = await auth()
    if (session?.user) redirect('/')
  }

  if (checkInbox) {
    return (
      <div>
        <h1 className="text-xl font-medium">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          We sent a magic link to your inbox. Click it to sign in.
        </p>
      </div>
    )
  }

  async function handleSignIn(formData: FormData) {
    'use server'
    await signIn('resend', { email: formData.get('email') as string })
  }

  return (
    <div>
      <h1 className="text-xl font-medium">Sign in to {storeConfig.identity.name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter your email and we will send you a magic link.
      </p>
      <form action={handleSignIn} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@company.com"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          Send magic link
        </button>
      </form>
    </div>
  )
}
