import type { DomainEventRecord, DomainEventType } from './contract'

export interface Subscriber {
  name: string
  handles: readonly DomainEventType[]
  handle: (event: DomainEventRecord) => Promise<void>
}

const subscribers: Subscriber[] = []

/** Registro boot-time. Idempotente por `name` (re-importes no duplican). */
export function registerSubscriber(sub: Subscriber): void {
  if (subscribers.some((s) => s.name === sub.name)) return
  subscribers.push(sub)
}

export function getSubscribersFor(type: DomainEventType): Subscriber[] {
  return subscribers.filter((s) => s.handles.includes(type))
}

/** Solo para tests. */
export function _resetSubscribers(): void {
  subscribers.length = 0
}
