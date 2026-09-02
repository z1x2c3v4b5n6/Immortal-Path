import type { PlayerStats, SpiritElement, SpiritRoot } from '../../models'

export interface TechniqueAffinity {
  multiplier: number
  matchedElements: SpiritElement[]
  missingElements: SpiritElement[]
  rating: '不契' | '普通' | '契合' | '极佳' | '天成'
}

export function calculateTechniqueAffinity(root: SpiritRoot, techniqueElements: SpiritElement[]): TechniqueAffinity {
  const required = [...new Set(techniqueElements)]
  const matchedElements = required.filter((element) => root.elements.includes(element))
  const missingElements = required.filter((element) => !root.elements.includes(element))
  const coverage = required.length ? matchedElements.length / required.length : 1
  const multiplier = Number((root.specializationMultiplier * (.45 + coverage * .55)).toFixed(3))
  const rating = multiplier >= 1.65 ? '天成' : multiplier >= 1.3 ? '极佳' : multiplier >= 1.05 ? '契合' : multiplier >= .8 ? '普通' : '不契'
  return { multiplier, matchedElements, missingElements, rating }
}

export function getSpiritRootBreakthroughModifier(root: SpiritRoot): number {
  return Number.isFinite(root.breakthroughModifier) ? root.breakthroughModifier : 0
}

export function applySpiritRootPotential(base: PlayerStats, modifiers: Partial<PlayerStats>): PlayerStats {
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, Math.max(1, value + (modifiers[key as keyof PlayerStats] ?? 0))])) as PlayerStats
}
