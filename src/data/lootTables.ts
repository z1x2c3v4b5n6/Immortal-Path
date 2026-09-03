import type { ItemQuality } from '../models'

export const QUALITY_ORDER: ItemQuality[] = ['凡品', '良品', '精品', '稀有', '极品', '奇珍']

export const LOOT_WEIGHTS: Record<'凡人' | '炼气' | '筑基' | '金丹' | '元婴' | '化神' | '炼虚' | '合体' | '大乘' | '渡劫', number[]> = {
  凡人: [45, 32, 16, 5, 1.8, 0.2],
  炼气: [35, 30, 20, 10, 4, 1],
  筑基: [15, 30, 28, 18, 7, 2],
  金丹: [5, 20, 30, 27, 14, 4],
  元婴: [0, 10, 28, 34, 22, 6],
  化神: [0, 5, 20, 35, 30, 10],
  炼虚: [0, 2, 13, 34, 36, 15],
  合体: [0, 0, 8, 30, 42, 20],
  大乘: [0, 0, 4, 24, 46, 26],
  渡劫: [0, 0, 2, 18, 48, 32],
}

export const PITY_CONFIG = { rareAfter: 10, epicGuaranteeAt: 30, rareBoost: 2.2, fortunateMultiplier: 1.25 }
