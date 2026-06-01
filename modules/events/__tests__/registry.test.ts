import { beforeEach, describe, expect, it, vi } from 'vitest'
import { _resetSubscribers, getSubscribersFor, registerSubscriber } from '../registry'

describe('subscriber registry', () => {
  beforeEach(() => {
    _resetSubscribers()
  })

  it('devuelve los suscriptores que manejan un tipo', () => {
    registerSubscriber({ name: 'a', handles: ['order.placed'], handle: vi.fn() })
    registerSubscriber({ name: 'b', handles: ['payment.captured'], handle: vi.fn() })
    const subs = getSubscribersFor('order.placed')
    expect(subs.map((s) => s.name)).toEqual(['a'])
  })

  it('deduplica por nombre (registro idempotente al boot)', () => {
    const sub = { name: 'a', handles: ['order.placed'] as const, handle: vi.fn() }
    registerSubscriber(sub)
    registerSubscriber(sub)
    expect(getSubscribersFor('order.placed')).toHaveLength(1)
  })
})
