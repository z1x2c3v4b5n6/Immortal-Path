import { itemById } from '../../data/items'
import { marketCatalogEntry } from '../../data/marketCatalog'
import { ItemCategory, type MarketListing, type MarketState, type Player, type TradeRecord, type WorldState } from '../../models'
import { addProfessionExperience } from '../professions/professions'
import { supplyDemand, refreshListingPrices } from './market'
import { volumeAdjustedTotal } from './pricing'

function record(player: Player, listing: MarketListing, quantity: number, type: 'BUY' | 'SELL', totalPrice: number, year: number) {
  const entry: TradeRecord = { id: crypto.randomUUID(), year, itemId: listing.itemId, quantity, type, unitPrice: Math.round(totalPrice / quantity), totalPrice, merchantType: listing.merchantType }
  player.tradeHistory.unshift(entry); player.tradeHistory.splice(150)
  const repeats = player.tradeHistory.filter((trade) => trade.year === year && trade.itemId === listing.itemId && trade.type === type).length
  const rarity = ['凡品', '良品', '精品', '稀有', '珍品', '极品', '奇珍', '传说'].indexOf(itemById(listing.itemId)?.quality ?? '凡品') + 1
  addProfessionExperience(player, 'COMMERCE', Math.max(1, Math.round(Math.log10(totalPrice + 1) * rarity * 2 / Math.max(1, repeats))), true)
}

export function buyMarketItem(player: Player, market: MarketState, world: WorldState, listingId: string, quantity: number) {
  const listing = market.listings.find((entry) => entry.listingId === listingId)
  quantity = Math.max(1, Math.floor(quantity))
  if (!listing || listing.quantity < quantity) return { ok: false, reason: '库存不足', total: 0 }
  const total = volumeAdjustedTotal(listing.buyPrice, quantity, 'BUY')
  if (player.spiritStones < total) return { ok: false, reason: '灵石不足', total }
  player.spiritStones -= total; listing.quantity -= quantity
  const stack = player.inventory.find((entry) => entry.itemId === listing.itemId)
  if (stack) stack.quantity += quantity; else player.inventory.push({ itemId: listing.itemId, quantity })
  const sd = supplyDemand(market, listing.itemId); sd.supply = Math.max(20, sd.supply - quantity * 2); sd.demand = Math.min(180, sd.demand + quantity); sd.trend = Math.min(1, sd.trend + quantity * .03)
  record(player, listing, quantity, 'BUY', total, world.currentYear); refreshListingPrices(market, world, player)
  return { ok: true, reason: '', total }
}

export function sellMarketItem(player: Player, market: MarketState, world: WorldState, listingId: string, quantity: number) {
  const listing = market.listings.find((entry) => entry.listingId === listingId)
  quantity = Math.max(1, Math.floor(quantity))
  const stack = listing && player.inventory.find((entry) => entry.itemId === listing.itemId)
  const item = listing && itemById(listing.itemId)
  if (!listing || !stack || stack.quantity < quantity) return { ok: false, reason: '持有数量不足', total: 0 }
  if (!marketCatalogEntry(listing.itemId)?.tradeable || item?.category === ItemCategory.QUEST) return { ok: false, reason: '此物不可交易', total: 0 }
  if (player.boundArtifact?.artifactId === listing.itemId || player.equipment.weapon === listing.itemId || player.equipment.armor === listing.itemId || player.equipment.accessory === listing.itemId || player.equipment.artifactSlots.includes(listing.itemId)) return { ok: false, reason: '已装备或绑定的物品不可出售', total: 0 }
  const total = volumeAdjustedTotal(listing.sellPrice, quantity, 'SELL')
  stack.quantity -= quantity; player.inventory = player.inventory.filter((entry) => entry.quantity > 0); player.spiritStones += total
  const sd = supplyDemand(market, listing.itemId); sd.supply = Math.min(180, sd.supply + quantity * 2); sd.demand = Math.max(20, sd.demand - quantity); sd.trend = Math.max(-1, sd.trend - quantity * .03)
  record(player, listing, quantity, 'SELL', total, world.currentYear); refreshListingPrices(market, world, player)
  return { ok: true, reason: '', total }
}
