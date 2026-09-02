import type { PlayerStats, StatKey } from '../../models'

export interface StatModification {
  before: number
  after: number
  appliedDelta: number
  exceededPotential: boolean
}

export function modifyStatValue(stats: PlayerStats, potential: PlayerStats, stat: StatKey, delta: number, allowBeyondPotential = false): StatModification {
  const before = stats[stat]
  let after = Math.max(1, before + delta)
  if (delta > 0 && !allowBeyondPotential) after = Math.max(before, Math.min(potential[stat], after))
  stats[stat] = after
  return { before, after, appliedDelta: after - before, exceededPotential: after > potential[stat] }
}

export function potentialRating(value: number) {
  if (value >= 100) return '绝世'
  if (value >= 90) return '极佳'
  if (value >= 80) return '优秀'
  if (value >= 70) return '良好'
  return '平常'
}
