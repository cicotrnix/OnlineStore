import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => {
  const success = vi.fn()
  const error = vi.fn()
  const info = vi.fn()
  return {
    toast: { success, error, info },
    __mocks: { success, error, info },
  }
})

const sonnerMock = (await import('sonner')) as unknown as {
  toast: {
    success: ReturnType<typeof vi.fn>
    error: ReturnType<typeof vi.fn>
    info: ReturnType<typeof vi.fn>
  }
}
const toastSuccess = sonnerMock.toast.success
const toastError = sonnerMock.toast.error
const toastInfo = sonnerMock.toast.info

import { ToastFlashReader } from '../ToastFlashReader'

function setLocation(url: string) {
  // jsdom supports history.replaceState; set href via window.history.pushState
  window.history.replaceState({}, '', url)
}

beforeEach(() => {
  toastSuccess.mockReset()
  toastError.mockReset()
  toastInfo.mockReset()
  setLocation('/')
})

afterEach(() => {
  cleanup()
})

describe('ToastFlashReader', () => {
  it('sin query params → no dispara toast', () => {
    setLocation('/')
    render(<ToastFlashReader locale="en-US" />)
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(toastInfo).not.toHaveBeenCalled()
  })

  it('?toast=success&msg=key → toast.success traducido + URL limpia', () => {
    setLocation('/?toast=success&msg=localeSwitch.label')
    render(<ToastFlashReader locale="en-US" />)
    expect(toastSuccess).toHaveBeenCalledWith('Language')
    expect(window.location.search).toBe('')
  })

  it('?toast=error&msg=key → toast.error', () => {
    setLocation('/?toast=error&msg=localeSwitch.label')
    render(<ToastFlashReader locale="es-419" />)
    expect(toastError).toHaveBeenCalledWith('Idioma')
  })

  it('?toast=info con vars JSON encoded → traduce con vars', () => {
    const vars = encodeURIComponent(JSON.stringify({ name: 'X' }))
    setLocation(`/?toast=info&msg=localeSwitch.label&vars=${vars}`)
    render(<ToastFlashReader locale="en-US" />)
    // localeSwitch.label no usa vars; verificamos que el toast fue llamado igual
    expect(toastInfo).toHaveBeenCalled()
  })

  it('refresh no re-dispara (URL queda limpia)', () => {
    setLocation('/?toast=success&msg=localeSwitch.label')
    const { unmount } = render(<ToastFlashReader locale="en-US" />)
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    unmount()
    // Re-mount con URL ya limpia debería no disparar de nuevo.
    toastSuccess.mockReset()
    render(<ToastFlashReader locale="en-US" />)
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
