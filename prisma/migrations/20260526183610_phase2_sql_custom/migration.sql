-- Phase 2 custom SQL: per-year sequences for Quote/Invoice + XOR constraint on OrganizationCatalogAccess

CREATE SEQUENCE IF NOT EXISTS quote_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq_2026 START 1;

ALTER TABLE "OrganizationCatalogAccess"
  ADD CONSTRAINT "exactly_one_target" CHECK (
    ("productId" IS NOT NULL AND "categoryId" IS NULL) OR
    ("productId" IS NULL AND "categoryId" IS NOT NULL)
  );
