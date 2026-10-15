import { ITEMS, itemById } from '../../data/items'
import { MARKET_CATALOG, marketCatalogEntry } from '../../data/marketCatalog'
import { MERCHANTS } from '../../data/merchants'
import { ItemCategory, type MarketState, type MerchantType, type Player, type SupplyDemandState, type WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'
import { calculateMarketPrice } from './pricing'

export const initialMarketState = (year = 100): MarketState => ({ cycle: 0, lastRefreshYear: year - 3, listings: [], supplyDemand: MARKET_CATALOG.filter((entry) => entry.tradeable).map((entry) => ({ itemId: entry.itemId, supply: 100, demand: 100, trend: 0, lastUpdatedYear: year })), rumors: [] })

export function supplyDemand(market: MarketState, itemId: string): SupplyDemandState {
  let state = market.supplyDemand.find((entry) => entry.itemId === itemId)
  if (!state) { state = { itemId, supply: 100, demand: 100, trend: 0, lastUpdatedYear: market.lastRefreshYear }; market.supplyDemand.push(state) }
  return state
}

function merchantFor(itemId: string, rng: RandomService, blackMarket: boolean): MerchantType {
  const item = itemById(itemId)
  if (blackMarket && marketCatalogEntry(itemId)?.marketTags.some((tag) => ['魔道', '鬼道'].includes(tag))) return '黑市商人'
  const candidates = MERCHANTS.filter((entry) => item?.category && entry.categories.includes(item.category) && entry.type !== '黑市商人')
  return rng.pick(candidates.length ? candidates : MERCHANTS.filter((entry) => entry.type === '杂货商')).type
}

export function blackMarketUnlocked(player?: Player) { return Boolean(player && (player.primaryPath === 'demonic' || player.primaryPath === 'ghost' || player.fateTags.some((tag) => /黑市|魔道|鬼市/.test(tag.name + tag.id)))) }

export function refreshMarket(market: MarketState, world: WorldState, rng: RandomService, player?: Player, force = false) {
  if (!force && world.currentYear < market.lastRefreshYear + 2) return false
  const retained = force ? [] : market.listings.filter((listing) => {
    const refreshYears = MERCHANTS.find((merchant) => merchant.type === listing.merchantType)?.refreshYears ?? 2
    return listing.quantity > 0 && world.currentYear < listing.refreshYear + refreshYears
  })
  market.cycle++
  market.lastRefreshYear = world.currentYear
  const black = blackMarketUnlocked(player)
  const maxQuality = player ? Math.min(7, 2 + Math.floor(player.realmIndex / 4)) : 3
  const qualityOrder = ['凡品', '良品', '精品', '稀有', '珍品', '极品', '奇珍', '传说']
  const candidates = ITEMS.filter((item) => {
    const catalog = marketCatalogEntry(item.id)
    return catalog?.tradeable && qualityOrder.indexOf(item.quality) <= maxQuality && item.quality !== '传说' && (black || !catalog.marketTags.some((tag) => ['魔道', '鬼道'].includes(tag)))
  })
  const targetCount = Math.max(8, Math.min(18, 8 + Math.floor((player?.realmIndex ?? 0) / 3)))
  const retainedIds = new Set(retained.map((listing) => listing.itemId))
  const chosen = candidates.filter((item) => !retainedIds.has(item.id)).filter(() => rng.chance(.62)).slice(0, Math.max(0, targetCount - retained.length))
  market.listings = [...retained, ...chosen.map((item) => {
    const merchantType = merchantFor(item.id, rng, black)
    const sd = supplyDemand(market, item.id)
    const price = calculateMarketPrice(item.id, sd, world, merchantType, player)
    const rare = qualityOrder.indexOf(item.quality)
    return { listingId: `${world.seed}:${world.currentYear}:${market.cycle}:${item.id}`, itemId: item.id, quantity: Math.max(1, rng.randomInt(2, 10) - rare), buyPrice: price.buyPrice, sellPrice: price.sellPrice, merchantType, refreshYear: world.currentYear, trend: sd.trend, reasons: price.reasons }
  })]
  return true
}

export function refreshListingPrices(market: MarketState, world: WorldState, player?: Player) {
  for (const listing of market.listings) {
    const price = calculateMarketPrice(listing.itemId, supplyDemand(market, listing.itemId), world, listing.merchantType, player)
    listing.buyPrice = price.buyPrice; listing.sellPrice = price.sellPrice; listing.reasons = price.reasons; listing.trend = supplyDemand(market, listing.itemId).trend
  }
}

export function marketCategory(itemId: string) { return itemById(itemId)?.category ?? ItemCategory.SPECIAL }
