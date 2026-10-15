import { itemById } from '../../data/items'
import { fallbackBaseValue, marketCatalogEntry } from '../../data/marketCatalog'
import type { MerchantType, Player, PriceReason, SupplyDemandState, WorldState } from '../../models'
import { commerceSpread } from '../professions/professions'

export const PRICE_MIN = .55
export const PRICE_MAX = 2.5

export function baseItemValue(itemId: string) {
  const configured = marketCatalogEntry(itemId)
  const item = itemById(itemId)
  return configured?.baseValue ?? (item ? fallbackBaseValue(item) : 1)
}

export function worldPriceReasons(itemId: string, world: WorldState): PriceReason[] {
  const tags = marketCatalogEntry(itemId)?.marketTags ?? []
  const text = world.worldEvents.filter((event) => event.year + 8 >= world.currentYear).slice(0, 20).map((event) => event.text).join('|')
  const reasons: PriceReason[] = []
  if (/大战|开战|战争/.test(text) && tags.some((tag) => ['疗伤', '武器', '防具', '矿石'].includes(tag))) reasons.push({ label: '宗门战争', modifier: .2 })
  if (/兽潮/.test(text)) {
    if (tags.some((tag) => ['疗伤', '武器'].includes(tag))) reasons.push({ label: '兽潮备战', modifier: .16 })
    if (tags.includes('妖兽材料')) reasons.push({ label: '兽潮材料涌入', modifier: -.14 })
  }
  if (/灵药.*丰|丰收/.test(text) && tags.some((tag) => ['灵药', '丹药'].includes(tag))) reasons.push({ label: '灵药丰收', modifier: -.16 })
  if (/秘境.*开|秘境重现/.test(text) && tags.some((tag) => ['破禁', '疗伤'].includes(tag))) reasons.push({ label: '秘境开启', modifier: .13 })
  if (world.continent.era === 'GOLDEN' && tags.some((tag) => ['珍品', '稀有'].includes(tag))) reasons.push({ label: '修仙盛世', modifier: .12 })
  if (world.continent.era === 'DECLINING' && tags.some((tag) => ['低阶', '修炼'].includes(tag))) reasons.push({ label: '灵气衰退', modifier: .18 })
  return reasons
}

const merchantModifier: Record<MerchantType, number> = { 杂货商: 1, 灵药商: .95, 丹药商: 1.05, 材料商: .98, 法器商: 1.12, 游商: 1.2, 黑市商人: 1.35 }

export function calculateMarketPrice(itemId: string, supply: SupplyDemandState, world: WorldState, merchant: MerchantType, player?: Player) {
  const base = baseItemValue(itemId)
  const supplyDemandModifier = Math.max(.7, Math.min(1.55, 1 + (supply.demand - supply.supply) / 220))
  const eraModifier = world.continent.era === 'GOLDEN' ? 1.08 : world.continent.era === 'DECLINING' ? 1.12 : world.continent.era === 'PROSPEROUS' ? .96 : 1
  const reasons = worldPriceReasons(itemId, world)
  const eventModifier = reasons.reduce((value, reason) => value * (1 + reason.modifier), 1)
  const raw = Math.max(PRICE_MIN, Math.min(PRICE_MAX, supplyDemandModifier * eraModifier * eventModifier * merchantModifier[merchant]))
  const commerce = player ? commerceSpread(player) : { buyDiscount: 0, sellBonus: 0 }
  const buyPrice = Math.max(1, Math.round(base * raw * (1 - commerce.buyDiscount)))
  const sellRatio = Math.min(.82, .66 + commerce.sellBonus)
  const sellPrice = Math.max(1, Math.min(buyPrice - 1, Math.floor(buyPrice * sellRatio)))
  return { base, modifier: raw, buyPrice, sellPrice, reasons: [{ label: '供需', modifier: supplyDemandModifier - 1 }, { label: `商人：${merchant}`, modifier: merchantModifier[merchant] - 1 }, ...reasons] }
}

export function volumeAdjustedTotal(unitPrice: number, quantity: number, direction: 'BUY' | 'SELL') {
  let total = 0
  for (let index = 0; index < quantity; index++) total += Math.max(1, Math.round(unitPrice * (1 + (direction === 'BUY' ? 1 : -1) * Math.min(.18, index * .009))))
  return total
}
