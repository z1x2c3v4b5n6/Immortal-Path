import type { ItemCategory, MerchantType } from '../models'

export interface MerchantDefinition { type: MerchantType; categories: ItemCategory[]; buyModifier: number; refreshYears: number; rareChance: number }

export const MERCHANTS: MerchantDefinition[] = [
  { type: '杂货商', categories: ['MATERIAL', 'PILL', 'SPECIAL'] as ItemCategory[], buyModifier: 1, refreshYears: 2, rareChance: .03 },
  { type: '灵药商', categories: ['MATERIAL'] as ItemCategory[], buyModifier: .95, refreshYears: 2, rareChance: .05 },
  { type: '丹药商', categories: ['PILL'] as ItemCategory[], buyModifier: 1.05, refreshYears: 3, rareChance: .09 },
  { type: '材料商', categories: ['MATERIAL'] as ItemCategory[], buyModifier: .98, refreshYears: 2, rareChance: .07 },
  { type: '法器商', categories: ['WEAPON', 'ARMOR', 'ACCESSORY', 'ARTIFACT'] as ItemCategory[], buyModifier: 1.12, refreshYears: 4, rareChance: .12 },
  { type: '游商', categories: ['MATERIAL', 'PILL', 'ARTIFACT', 'SPECIAL'] as ItemCategory[], buyModifier: 1.2, refreshYears: 5, rareChance: .18 },
  { type: '黑市商人', categories: ['MATERIAL', 'PILL', 'ARTIFACT', 'SPECIAL'] as ItemCategory[], buyModifier: 1.35, refreshYears: 5, rareChance: .24 },
]
