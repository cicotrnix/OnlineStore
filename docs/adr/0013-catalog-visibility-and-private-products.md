# ADR 0013 — Catalog visibility model (private products + per-org grants)

Date: 2026-05-26
Status: Accepted (Fase 2)

## Context

Some wholesale catalogs include products that should only be visible to specific buyer organizations (private contracts, special distributions, restricted brands). We need:

- a way to mark a product (or whole category) as `isPrivate`
- a way to grant an organization access to a specific product or category
- filtering at the read path so anonymous and non-granted users never see the product, anywhere

## Decision

- `Product.isPrivate` and `Category.isPrivate` booleans (default false).
- New `OrganizationCatalogAccess { organizationId, productId?, categoryId?, grantedById }` join table with a SQL CHECK constraint `exactly_one_target` (product XOR category).
- `modules/catalog/visibility.ts::filterForOrg(orgId, products)` is the single read-side filter:
  - if `privateCatalogs` flag is off → return all
  - if `orgId === null` (anonymous) → drop anything where `isPrivate === true` on product or category
  - else load all `OrganizationCatalogAccess` rows for `orgId` and keep products that are public OR explicitly granted (by productId, or by their categoryId).
- `catalogService.listProductsVisible(orgId, opts)` and `findProductBySlugVisible(orgId, slug)` are the storefront entry points. Admin pages use the raw `listProducts/findProductBySlug` and see everything.

## Consequences

Positive:
- Visibility is one function, easy to audit.
- DB constraint enforces the product XOR category invariant.
- Flag-gated; turning `privateCatalogs` off restores fully-public behavior.

Negative:
- Filtering happens in app code, not in SQL. For 50 products and a handful of grants per org this is fine; for 100k+ catalogs we'd want a SQL push-down (left join + filter).
- We over-fetch a small amount (`take * 2`) to keep page sizes roughly correct after filtering. The slack is bounded.

## References

- `modules/catalog/visibility.ts`
- `modules/catalog/service.ts` (`listProductsVisible`, `findProductBySlugVisible`)
- `prisma/migrations/20260526183610_phase2_sql_custom/migration.sql` (CHECK constraint)
