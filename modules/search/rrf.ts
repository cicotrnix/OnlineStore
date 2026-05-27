export interface RankedResult {
  id: string
  score: number
}

export function mergeRankings(meiliRanks: string[], vectorRanks: string[], k = 60): RankedResult[] {
  const scores = new Map<string, number>()

  meiliRanks.forEach((id, idx) => {
    const score = 1 / (k + idx + 1)
    scores.set(id, (scores.get(id) ?? 0) + score)
  })

  vectorRanks.forEach((id, idx) => {
    const score = 1 / (k + idx + 1)
    scores.set(id, (scores.get(id) ?? 0) + score)
  })

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

export const RRF_K_DEFAULT = 60
