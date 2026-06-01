// Deprecated: this module used to wrap session maintenance for edge middleware.
// Auth.js v5 with strategy=database cannot run Prisma in Next.js edge runtime,
// so session refresh + impersonation auto-expiry moved to RSC layouts.
// Use `lib/auth/maintain.ts::maintainCurrentSession` instead.
export { maintainCurrentSession as maintainSession } from './maintain'
