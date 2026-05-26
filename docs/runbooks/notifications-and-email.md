# Runbook — Notifications and email

## What gets emailed

Every `dispatch({ userIds, type, title, body, link, subjectType, subjectId })`:
1. Inserts one `Notification` row per `userId`.
2. Asynchronously calls `sendEmail()` for each row using the template mapped by `type` in `TEMPLATES`.
3. On success → stamps `emailSentAt = now`.
4. On failure → records `emailFailedReason` and increments `emailRetryCount`.

## Where the bell badge counts come from

`NotificationBadge` (in the storefront header) renders a server-side `countUnread(userId)` — number of `Notification` rows where `readAt IS NULL` for the current user.

## Retrying failed emails

```ts
import { retryFailedEmails } from '@/modules/notifications'
await retryFailedEmails() // picks up rows with emailSentAt IS NULL, emailRetryCount < 5
```

`MAX_RETRY = 5`, `RETRY_DELAY_MS = 60_000` (between batches). Run this on a cron every 5 minutes.

## Local dev / tests — no real emails

If `RESEND_API_KEY` is not set, `lib/email/resend.ts::sendEmail` logs `{ noop: true }` and returns `{ id: 'noop' }`. The Notification row is still created, but no network call happens.

In tests, mock the module:
```ts
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-id-mock' }),
}))
```

## Adding a new notification type

1. Add the enum variant in `prisma/schema.prisma` → migrate.
2. Add a row to `TEMPLATES` in `modules/notifications/email/index.ts` with `{ subject, cta }`. The `_base.tsx` template handles layout.
3. Call `dispatch({ type: 'YOUR_NEW_TYPE', ... })` from the relevant module.

## Common failures

| Symptom                                  | Cause                                            | Fix                                            |
|------------------------------------------|--------------------------------------------------|------------------------------------------------|
| Bell badge always 0                      | user never seeded with notifications             | Run `pnpm db:seed`                             |
| `Notification` rows but no email         | `RESEND_API_KEY` missing                         | Set in `.env.local` / Coolify env              |
| `emailFailedReason` repeats              | Resend rejected (bad address, rate limit)        | Inspect message, fix template/data, drop row to retry |
| Retry climbs to 5 then stops             | persistent failure                               | Inspect, fix, then reset row: `UPDATE "Notification" SET "emailRetryCount" = 0 WHERE id = …` |
