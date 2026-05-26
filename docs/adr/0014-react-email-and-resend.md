# ADR 0014 — react-email templates + Resend SDK, with noop fallback

Date: 2026-05-26
Status: Accepted (Fase 2)

## Context

Fase 2 sends a lot of transactional email: quote submitted/quoted/expiring/accepted/rejected, invoice issued/due-soon/overdue/paid, approval requested/granted/rejected, credit warning. We need:

- consistent brand styling
- a way to render HTML and plain-text from one source
- a provider that's reliable and cheap
- a path to develop and test without sending real emails

## Decision

- **Templates:** `react-email` (v1) with a shared `_base.tsx` layout and a `make(cta)` factory that produces all 14 notification templates from a small config.
- **Provider:** Resend SDK (v6) via a thin wrapper `lib/email/resend.ts`. The wrapper exports a single `sendEmail({to, subject, react})` function.
- **Fallback:** if `RESEND_API_KEY` is unset, `sendEmail` logs and returns `{id: 'noop'}`. Tests and local dev work with no external dependency.
- **Tests:** `vi.mock('@/lib/email/resend')` replaces `sendEmail` with a spy in unit tests so we can assert "we tried to send" without making network calls.

## Consequences

Positive:
- One renderer (`@react-email/render`) produces both HTML and plain-text fallback.
- Local dev never accidentally emails real users.
- Adding a new notification = config row + handler caller, not a new template file.

Negative:
- React-email versions are still pre-1.0 in ecosystem maturity; we pinned to v1.0.12 / `@react-email/render` v2 to avoid churn.
- The factory-style template means one file is the source for many emails. If a single email needs a radically custom layout, it has to break out of `make(cta)`.
- Resend lock-in for sending; switching providers is a single-file change but cost/feature parity is the constraint.

## References

- `modules/notifications/email/templates/_base.tsx`
- `modules/notifications/email/templates/index.tsx`
- `modules/notifications/email/index.ts` (TEMPLATES map)
- `lib/email/resend.ts`
