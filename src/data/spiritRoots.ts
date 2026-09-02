import type { SpiritRoot } from '../models'

export const ELEMENTS = ['金', '木', '水', '火', '土'] as const
export const SPIRIT_ROOT_CONFIG = { randomLuckBonus: 3, variantWeightBonus: 1.25 }

export const SPIRIT_ROOT_ARCHETYPES: Array<SpiritRoot & { weight: number }> = [
  { id: 'five', name: '五灵根', rank: 1, multiplier: .86, elements: [...ELEMENTS], weight: 5 },
  { id: 'four', name: '四灵根', rank: 2, multiplier: .95, elements: ['木', '水', '火', '土'], weight: 10 },
  { id: 'three', name: '三灵根', rank: 3, multiplier: 1.08, elements: ['金', '水', '土'], weight: 20 },
  { id: 'dual', name: '双灵根', rank: 4, multiplier: 1.22, elements: ['水', '木'], weight: 30 },
  { id: 'single', name: '单灵根', rank: 5, multiplier: 1.4, elements: ['火'], weight: 25 },
  { id: 'variant', name: '风雷异灵根', rank: 6, multiplier: 1.62, elements: ['风', '雷'], weight: 8 },
  { id: 'heaven', name: '混元天灵根', rank: 7, multiplier: 1.9, elements: ['混元'], weight: 2 },
]

export function manualSpiritRoot(rank: number, elements: string[]): SpiritRoot {
  const source = SPIRIT_ROOT_ARCHETYPES.find((root) => root.rank === rank) ?? SPIRIT_ROOT_ARCHETYPES[0]
  const picked = elements.slice(0, rank === 1 ? 5 : Math.max(1, 6 - rank))
  const suffix = rank === 4 ? '双灵根' : rank === 3 ? '三灵根' : source.name
  return { id: `manual-${rank}-${picked.join('-')}`, name: rank <= 2 ? source.name : `${picked.join('')}${suffix}`, rank, multiplier: source.multiplier, elements: picked.length ? picked : source.elements }
}
