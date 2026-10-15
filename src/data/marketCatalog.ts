import { ItemCategory, type ItemDefinition, type ItemQuality } from '../models'

export interface MarketCatalogEntry { itemId: string; baseValue: number; tradeable: boolean; marketTags: string[] }

export const MARKET_CATALOG: MarketCatalogEntry[] = [
  { itemId: 'green-spirit-herb', baseValue: 12, tradeable: true, marketTags: ['灵药', '低阶'] },
  { itemId: 'beast-bone', baseValue: 18, tradeable: true, marketTags: ['妖兽材料'] },
  { itemId: 'wolf-hide', baseValue: 22, tradeable: true, marketTags: ['妖兽材料'] },
  { itemId: 'black-iron', baseValue: 38, tradeable: true, marketTags: ['矿石', '武器'] },
  { itemId: 'yin-soul-sand', baseValue: 72, tradeable: true, marketTags: ['魂材', '鬼道'] },
  { itemId: 'five-element-stone', baseValue: 125, tradeable: true, marketTags: ['五行', '破禁'] },
  { itemId: 'blood-crystal', baseValue: 145, tradeable: true, marketTags: ['魔道', '稀有'] },
  { itemId: 'artifact-embryo', baseValue: 680, tradeable: true, marketTags: ['法宝', '珍品'] },
  { itemId: 'qi-pill', baseValue: 48, tradeable: true, marketTags: ['丹药', '修炼'] },
  { itemId: 'healing-pill', baseValue: 150, tradeable: true, marketTags: ['丹药', '疗伤'] },
  { itemId: 'foundation-pill', baseValue: 280, tradeable: true, marketTags: ['丹药', '突破'] },
  { itemId: 'longevity-pill', baseValue: 900, tradeable: true, marketTags: ['丹药', '延寿', '珍品'] },
  { itemId: 'green-edge-weapon', baseValue: 190, tradeable: true, marketTags: ['武器'] },
  { itemId: 'beast-bone-armor', baseValue: 260, tradeable: true, marketTags: ['防具'] },
  { itemId: 'sword-heart-charm', baseValue: 420, tradeable: true, marketTags: ['饰品', '剑道'] },
  { itemId: 'void-treasure', baseValue: 720, tradeable: true, marketTags: ['法宝', '破禁'] },
  { itemId: 'soul-calming-bell', baseValue: 760, tradeable: true, marketTags: ['法宝', '鬼道'] },
  { itemId: 'frost-edge-sword', baseValue: 1400, tradeable: true, marketTags: ['法宝', '武器', '剑道', '珍品'] },
  { itemId: 'jade-pendant', baseValue: 0, tradeable: false, marketTags: ['任务'] },
]

const QUALITY_VALUE: Record<ItemQuality, number> = { 凡品: 18, 良品: 35, 精品: 75, 稀有: 160, 珍品: 360, 极品: 720, 奇珍: 1500, 传说: 5000 }
const CATEGORY_MULTIPLIER: Partial<Record<ItemCategory, number>> = { [ItemCategory.MATERIAL]: .8, [ItemCategory.PILL]: 1.15, [ItemCategory.WEAPON]: 1.4, [ItemCategory.ARMOR]: 1.4, [ItemCategory.ACCESSORY]: 1.5, [ItemCategory.ARTIFACT]: 2.2, [ItemCategory.SPECIAL]: 1.6 }

export function marketCatalogEntry(itemId: string) { return MARKET_CATALOG.find((entry) => entry.itemId === itemId) }
export function fallbackBaseValue(item: ItemDefinition) { return Math.max(1, Math.round(QUALITY_VALUE[item.quality] * (CATEGORY_MULTIPLIER[item.category ?? ItemCategory.SPECIAL] ?? 1))) }
