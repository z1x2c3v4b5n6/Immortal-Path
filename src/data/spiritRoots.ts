import { ROOT_STAT_POINT_BONUS } from './creationConfig'
import type { PlayerStats, SpiritElement, SpiritRoot, SpiritRootQuality } from '../models'

export const STANDARD_ELEMENTS: SpiritElement[] = ['金', '木', '水', '火', '土']
export const MUTATED_ELEMENTS: SpiritElement[] = ['雷', '冰', '风', '暗', '光']
export const ELEMENTS = STANDARD_ELEMENTS

export interface RootCountRule {
  count: number
  cultivationMultiplier: number
  specializationMultiplier: number
  breakthroughModifier: number
  statPointBonus: number
  randomWeight: number
}

export const ROOT_COUNT_RULES: RootCountRule[] = [
  { count: 5, cultivationMultiplier: 1.35, specializationMultiplier: .90, breakthroughModifier: -.03, statPointBonus: ROOT_STAT_POINT_BONUS[5], randomWeight: 18 },
  { count: 4, cultivationMultiplier: 1.27, specializationMultiplier: .98, breakthroughModifier: -.01, statPointBonus: ROOT_STAT_POINT_BONUS[4], randomWeight: 22 },
  { count: 3, cultivationMultiplier: 1.18, specializationMultiplier: 1.08, breakthroughModifier: 0, statPointBonus: ROOT_STAT_POINT_BONUS[3], randomWeight: 25 },
  { count: 2, cultivationMultiplier: 1.10, specializationMultiplier: 1.22, breakthroughModifier: .025, statPointBonus: ROOT_STAT_POINT_BONUS[2], randomWeight: 23 },
  { count: 1, cultivationMultiplier: 1.00, specializationMultiplier: 1.40, breakthroughModifier: .05, statPointBonus: ROOT_STAT_POINT_BONUS[1], randomWeight: 12 },
]

export const ROOT_QUALITY_RULES: Record<SpiritRootQuality, { cultivation: number; specialization: number; label: string; randomWeight: number }> = {
  NORMAL: { cultivation: 1, specialization: 1, label: '凡品', randomWeight: 82 },
  PURE: { cultivation: 1.08, specialization: 1.12, label: '纯净', randomWeight: 16.5 },
  HEAVENLY: { cultivation: 1.185185, specialization: 1.25, label: '天品', randomWeight: 1.5 },
}

export const SPIRIT_ROOT_CONFIG = {
  randomLuckBonus: 3,
  mutationChance: .1,
  qualityLuckScale: .012,
  rareFiveElementHeavenlyMultiplier: 1.60,
} as const

export function rootCountRule(count: number) {
  return ROOT_COUNT_RULES.find((rule) => rule.count === count) ?? ROOT_COUNT_RULES[2]
}

export function uniqueSpiritElements(elements: readonly SpiritElement[]): SpiritElement[] {
  return [...new Set(elements)].slice(0, 5)
}

export function formatSpiritRootName(root: Pick<SpiritRoot, 'elements' | 'quality' | 'mutations'>): string {
  const elements = uniqueSpiritElements(root.elements)
  const count = elements.length
  const standardFive = count === 5 && STANDARD_ELEMENTS.every((element) => elements.includes(element))
  if (root.quality === 'HEAVENLY' && standardFive) return '五行天灵根'
  const prefix = root.quality === 'HEAVENLY' ? '天品' : root.quality === 'PURE' ? '纯净' : ''
  const suffix = count === 1 ? '灵根' : count === 2 ? '双灵根' : count === 3 ? '三灵根' : count === 4 ? '四灵根' : '五灵根'
  return `${prefix}${elements.join('')}${suffix}`
}

export function createSpiritRoot(elements: readonly SpiritElement[], quality: SpiritRootQuality = 'NORMAL'): SpiritRoot {
  const picked = uniqueSpiritElements(elements)
  if (!picked.length) picked.push('木')
  const rule = rootCountRule(picked.length)
  const qualityRule = ROOT_QUALITY_RULES[quality]
  const mutations = picked.filter((element) => MUTATED_ELEMENTS.includes(element))
  const cultivationMultiplier = quality === 'HEAVENLY' && picked.length === 5 && STANDARD_ELEMENTS.every((element) => picked.includes(element))
    ? SPIRIT_ROOT_CONFIG.rareFiveElementHeavenlyMultiplier
    : Number((rule.cultivationMultiplier * qualityRule.cultivation).toFixed(3))
  const root: SpiritRoot = {
    id: `${quality.toLowerCase()}-${picked.join('-')}`,
    name: '',
    elements: picked,
    quality,
    mutations,
    cultivationMultiplier,
    specializationMultiplier: Number((rule.specializationMultiplier * qualityRule.specialization).toFixed(3)),
    breakthroughModifier: rule.breakthroughModifier + (quality === 'PURE' ? .015 : quality === 'HEAVENLY' ? .035 : 0),
    statPointBonus: rule.statPointBonus,
  }
  root.name = formatSpiritRootName(root)
  return root
}

export function manualSpiritRoot(count: number, elements: SpiritElement[], quality: SpiritRootQuality = 'NORMAL'): SpiritRoot {
  return createSpiritRoot(elements.slice(0, Math.max(1, Math.min(5, count))), quality)
}

export const SPIRIT_ROOT_ARCHETYPES = ROOT_COUNT_RULES.map((rule) => ({
  ...createSpiritRoot(STANDARD_ELEMENTS.slice(0, rule.count)),
  weight: rule.randomWeight,
  count: rule.count,
}))

export function spiritRootPotentialModifiers(root: SpiritRoot): Partial<PlayerStats> {
  const modifiers: Partial<PlayerStats> = {}
  const add = (key: keyof PlayerStats, value: number) => { modifiers[key] = (modifiers[key] ?? 0) + value }
  for (const element of root.elements) {
    if (element === '金') add('soul', 1)
    if (element === '木') add('constitution', 2)
    if (element === '水') { add('soul', 1); add('comprehension', 1) }
    if (element === '火') add('constitution', 1)
    if (element === '土') add('constitution', 2)
    if (element === '雷') { add('soul', 2); add('constitution', 1) }
    if (element === '冰') { add('soul', 2); add('comprehension', 1) }
    if (element === '风') { add('luck', 1); add('comprehension', 2) }
    if (element === '暗') { add('soul', 3); add('charm', -1) }
    if (element === '光') { add('luck', 2); add('charm', 2) }
  }
  return modifiers
}
