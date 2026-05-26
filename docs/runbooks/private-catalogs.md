# Runbook — Private catalogs

## Concepts

- A **product** can be marked `isPrivate: true` → never visible to anonymous or non-granted orgs.
- A **category** can be marked `isPrivate: true` → ALL products in that category are private unless the org has access (by category, or to specific products inside it).
- An `OrganizationCatalogAccess` row grants one org access to one product OR one category (XOR enforced by SQL CHECK).

## Visibility rules (single source: `filterForOrg`)

| Caller             | `privateCatalogs` off | Anonymous (`orgId=null`) | Org without grant | Org with grant |
|--------------------|-----------------------|--------------------------|-------------------|----------------|
| Public product     | shown                 | shown                    | shown             | shown          |
| Private product    | shown                 | hidden                   | hidden            | shown          |
| Public product in private category | shown | hidden                   | hidden            | shown (if category granted) or shown (if product granted) |

## How to make a product private

1. `/admin/products` → toggle the **Privado** column for that product.
2. `/admin/customers/:id/credit` → under **Acceso a catálogo privado**, grant the org access to that product.

## How to make a whole category private

Only via Prisma Studio for now (`pnpm db:studio`): set `Category.isPrivate = true`. Then grant orgs access by `categoryId` from the customer page or `grantAccess({ organizationId, categoryId, ... })`.

## Verifying access

- Anonymous: visit `/products/<slug>` → should 404 if private.
- Logged-in org without grant: `/catalog` should not list the product, direct `/products/<slug>` 404s.
- Logged-in org with grant: product appears in `/catalog`, detail page works.

## Common pitfalls

- **Tests don't see private filtering** — `filterForOrg` short-circuits when `privateCatalogs=false`. In Vitest, mock `@/store.config` to force the flag on.
- **Performance on large catalogs** — current filter is in-memory after a `take * 2` over-fetch. For 10k+ catalogs, push the filter into the SQL `where` clause.
- **Cascade on grant** — `OrganizationCatalogAccess.product` and `.category` are `onDelete: Cascade`. Deleting the product removes the grant automatically.
