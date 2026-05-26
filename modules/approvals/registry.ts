import type { ApprovalRequest, ApprovalSubject, Prisma } from '@prisma/client'

type Handler = (req: ApprovalRequest, tx: Prisma.TransactionClient) => Promise<void>

class Registry {
  private handlers = new Map<ApprovalSubject, Handler>()
  set(subject: ApprovalSubject, handler: Handler): void {
    this.handlers.set(subject, handler)
  }
  get(subject: ApprovalSubject): Handler | undefined {
    return this.handlers.get(subject)
  }
}

export const registry = new Registry()

export function subscribe(subject: ApprovalSubject, handler: Handler): void {
  registry.set(subject, handler)
}
