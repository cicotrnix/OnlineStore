# Runbook — Approvals management

## When does an approval get raised?

When a buyer places an order (or accepts a quote that becomes an order) and:
- `modules.approvals` is enabled, AND
- the org has `approvalThreshold` set, AND
- `orderTotal >= approvalThreshold`.

An `ApprovalRequest(PENDING, subjectType: ORDER, subjectId: <order.id>)` is created. The order is held in `PENDING_APPROVAL`.

## Who can approve?

Any user that satisfies `canApprove(userId, organizationId)` — currently: `isPlatformAdmin === true` OR `OrganizationMember.role === 'OWNER'`. Same rules block the `/approvals` decide actions.

## Admin flow

1. `/approvals` (storefront, for org owners) or `/admin/approvals` (platform admin, read-only history).
2. Open a PENDING request, click **Approve** or **Reject**.
3. `decide()` flips status via `updateMany({ where: { status: 'PENDING' } })` so a double-click can't double-decide. If the count comes back 0, the action throws `ApprovalAlreadyDecidedError` — the UI catches it and shows a friendly message.
4. The matching subject handler (`subscribe('ORDER', ...)`) runs in the same transaction:
   - **APPROVED**: order → `CONFIRMED`, `confirmedAt = now`. If `paymentMethod = NET_TERMS`, also creates the invoice.
   - **REJECTED**: order → `CANCELLED`, stock restored to each product.

## Adding a new approvable subject

1. Add `MY_THING` to `enum ApprovalSubject` in `prisma/schema.prisma`, migrate.
2. Create `modules/mything/approval-hook.ts` with `subscribe('MY_THING', async (req, tx) => { … })`.
3. Add an import line in `instrumentation.ts`.
4. Caller code: `await request({ subjectType: 'MY_THING', subjectId, ... })`.

## Common failures

| Error                              | Cause                                  | Fix                              |
|------------------------------------|----------------------------------------|----------------------------------|
| `ApprovalAlreadyDecidedError`      | request already approved/rejected      | Refresh — no action needed       |
| Hook didn't run                    | hook file not imported in `instrumentation.ts` | Add the import, redeploy |
| Stock not restored on REJECT       | `restoreStock` errored mid-transaction | Rollback already happened; manually adjust stock and document in audit log |
