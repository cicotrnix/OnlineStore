import { describe, expect, it } from 'vitest'
import { INITIAL_ACTION_RESULT, toastUrl } from '../action-result'

describe('toastUrl', () => {
  it('genera URL con toast + msg sin vars', () => {
    expect(toastUrl('/admin/customers/abc', 'success', 'admin.toast.approved')).toBe(
      '/admin/customers/abc?toast=success&msg=admin.toast.approved'
    )
  })

  it('incluye vars encoded cuando se pasan', () => {
    const url = toastUrl('/cart', 'info', 'cart.toast.added', { name: 'Battery' })
    expect(url).toMatch(/\?toast=info/)
    expect(url).toMatch(/&msg=cart.toast.added/)
    expect(url).toMatch(/&vars=/)
    const params = new URL(`http://x${url}`).searchParams
    const vars = JSON.parse(decodeURIComponent(params.get('vars')!))
    expect(vars).toEqual({ name: 'Battery' })
  })

  it('variantes error e info', () => {
    expect(toastUrl('/x', 'error', 'errors.unexpected')).toContain('toast=error')
    expect(toastUrl('/x', 'info', 'msg.something')).toContain('toast=info')
  })
})

describe('INITIAL_ACTION_RESULT', () => {
  it('estado neutro sin mensaje', () => {
    expect(INITIAL_ACTION_RESULT).toEqual({ ok: false })
  })
})
