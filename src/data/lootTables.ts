import type { ItemQuality } from '../models'

export const QUALITY_ORDER: ItemQuality[] = ['凡品', '良品', '精品', '稀有', '极品', '奇珍']

export const LOOT_WEIGHTS: Record<'凡人' | '炼气' | '筑基' | '金丹' | '元婴', number[]> = {
  凡人: [45, 32, 16, 5, 1.8, 0.2],
  炼气: [35, 30, 20, 10, 4, 1],
  筑基: [15, 30, 28, 18, 7, 2],
  金丹: [5, 20, 30, 27, 14, 4],
  元婴: [0, 10, 28, 34, 22, 6],
}

export const PITY_CONFIG = { rareAfter: 10, epicGuaranteeAt: 30, rareBoost: 2.2, fortunateMultiplier: 1.25 }
