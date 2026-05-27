-- HNSW index for fast vector similarity (cosine distance) on Product.embedding.
-- pgvector extension installed since Phase 0.
-- Build is trivial on empty table; bulk cost arrives during Phase 3 bootstrap (Parte 9).
-- Maintenance cost scales with embedding updates; acceptable for B2B catalog volumes.
CREATE INDEX IF NOT EXISTS product_embedding_hnsw_idx
  ON "Product"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
