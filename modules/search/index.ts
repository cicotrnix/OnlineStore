export { query } from './query'
export type { QueryInput, QueryResult, SearchMode } from './query'
export { enqueueIndex, processIndexQueue } from './index-queue'
export type { ProcessResult } from './index-queue'
export { mergeRankings, RRF_K_DEFAULT } from './rrf'
export { PRICE_BUCKETS, computeFacets } from './facets'
export type { FacetCounts, PriceBucket } from './facets'
export { filterAccessibleIds, getAccessGrants } from './access'
export type { AccessGrants } from './access'
export {
  buildSearchableText,
  embedProductText,
  embedSearchQuery,
  formatVectorForPostgres,
} from './embeddings'
