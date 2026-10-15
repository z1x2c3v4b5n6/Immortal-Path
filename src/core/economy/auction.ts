import { AUCTION_POOL } from '../../data/auctionPools'
import { itemById } from '../../data/items'
import { marketCatalogEntry } from '../../data/marketCatalog'
import { ItemCategory, type AuctionLot, type AuctionState, type NPCCultivator, type Player, type WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'
import { addProfessionExperience, commerceSpread } from '../professions/professions'
import { baseItemValue } from './pricing'

export const initialAuctionState = (year = 100): AuctionState => ({ id: `auction-${year}`, year, status: 'CLOSED', lots: [], history: [], nextAuctionYear: year + (5 - year % 5 || 5) })

function npcInterest(npc: NPCCultivator, itemId: string, world: WorldState) {
  const item = itemById(itemId); let value = .45
  if (npc.path === 'sword' && (item?.preferredPaths?.includes('sword') || item?.category === 'WEAPON')) value += .35
  if (npc.path === 'ghost' && (item?.preferredPaths?.includes('ghost') || /魂|阴/.test(item?.name ?? ''))) value += .3
  if (npc.path === 'demonic' && /血|魔|煞/.test(item?.name ?? '')) value += .25
  if (item?.preferredElements?.some((element) => npc.spiritRoot.elements.includes(element))) value += .18
  const sectType = world.sects.find((sect) => sect.id === npc.sectId)?.type
  if (sectType === '丹宗' && (item?.category === ItemCategory.PILL || item?.category === ItemCategory.MATERIAL)) value += .2
  if (sectType === '器宗' && [ItemCategory.WEAPON, ItemCategory.ARMOR, ItemCategory.ARTIFACT, ItemCategory.MATERIAL].includes(item?.category ?? ItemCategory.SPECIAL)) value += .2
  if (npc.profession?.id === 'ALCHEMY' && (item?.category === ItemCategory.PILL || item?.category === ItemCategory.MATERIAL)) value += .12
  if (npc.profession?.id === 'REFINING' && [ItemCategory.WEAPON, ItemCategory.ARMOR, ItemCategory.ARTIFACT, ItemCategory.MATERIAL].includes(item?.category ?? ItemCategory.SPECIAL)) value += .12
  return Math.max(.15, Math.min(1, value))
}

function npcBudget(npc: NPCCultivator, interest: number) {
  const positionBonus = npc.position?.includes('长老') ? 1.5 : npc.position?.includes('真传') ? 1.25 : 1
  const personalityBonus = /豪迈|骄傲/.test(npc.personality) ? 1.12 : /谨慎/.test(npc.personality) ? .88 : 1
  return Math.round((npc.realmIndex + 2) ** 2 * 18 * (.7 + interest) * positionBonus * personalityBonus)
}

function npcBids(world: WorldState, itemId: string, startingPrice: number, rng: RandomService): AuctionLot['bids'] {
  const living = world.npcCultivators.filter((npc) => npc.alive)
  const selected = living.filter(() => rng.chance(.38)).slice(0, 3)
  for (const npc of living) {
    if (selected.length >= Math.min(3, living.length)) break
    if (!selected.some((entry) => entry.id === npc.id)) selected.push(npc)
  }
  return selected.map((npc) => {
    const interest = npcInterest(npc, itemId, world)
    const budget = npcBudget(npc, interest)
    return { bidderId: npc.id, bidderName: npc.name, amount: 0, maxBid: Math.max(startingPrice, Math.round(budget * interest)), interest, round: 0 }
  })
}

export function createAuction(world: WorldState, rng: RandomService, existing?: AuctionState): AuctionState {
  const selectedItems = AUCTION_POOL.filter(() => rng.chance(.58)).slice(0, 4)
  if (!selectedItems.length) selectedItems.push(rng.pick(AUCTION_POOL))
  const lots: AuctionLot[] = selectedItems.map((itemId, index) => {
    const start = Math.max(50, Math.round(baseItemValue(itemId) * rng.randomInt(75, 100) / 100))
    const lot: AuctionLot = { id: `${world.seed}:${world.currentYear}:lot:${index}:${itemId}`, itemId, quantity: 1, startingPrice: start, currentPrice: start, sellerType: 'WORLD', bids: [], status: 'OPEN', remainingRounds: 3, reservedPlayerBid: 0 }
    lot.bids = npcBids(world, itemId, start, rng)
    return lot
  })
  return { id: `auction-${world.seed}-${world.currentYear}`, year: world.currentYear, status: 'OPEN', lots, history: existing?.history ?? [], nextAuctionYear: world.currentYear + 5 }
}

export function placePlayerBid(player: Player, lot: AuctionLot, amount: number) {
  if (lot.status !== 'OPEN' || lot.sellerId === player.id) return { ok: false, reason: '不可竞拍此物' }
  const minimum = Math.max(lot.startingPrice, lot.currentPrice + Math.max(1, Math.ceil(lot.currentPrice * .05)))
  amount = Math.floor(amount)
  const extra = amount - lot.reservedPlayerBid
  if (amount < minimum) return { ok: false, reason: `出价至少为 ${minimum}` }
  if (player.spiritStones < extra) return { ok: false, reason: '可用灵石不足' }
  player.spiritStones -= extra; lot.reservedPlayerBid = amount; lot.currentPrice = amount; lot.winnerId = player.id
  lot.bids.push({ bidderId: player.id, bidderName: player.name, amount, maxBid: amount, interest: 1, round: 4 - lot.remainingRounds })
  return { ok: true, reason: '' }
}

export function advanceAuctionRound(player: Player, lot: AuctionLot) {
  if (lot.status !== 'OPEN') return false
  const npc = lot.bids.filter((bid) => bid.bidderId !== player.id && bid.maxBid > lot.currentPrice).sort((a, b) => b.interest - a.interest || b.maxBid - a.maxBid)[0]
  if (npc) {
    const next = Math.min(npc.maxBid, Math.max(lot.currentPrice + 1, Math.ceil(lot.currentPrice * 1.08)))
    if (lot.winnerId === player.id && lot.reservedPlayerBid) { player.spiritStones += lot.reservedPlayerBid; lot.reservedPlayerBid = 0 }
    npc.amount = next; npc.round = 4 - lot.remainingRounds; lot.currentPrice = next; lot.winnerId = npc.bidderId
  }
  lot.remainingRounds--
  return true
}

export function consignAuctionItem(player: Player, auction: AuctionState, world: WorldState, rng: RandomService, itemId: string, quantity: number, startingPrice: number) {
  const stack = player.inventory.find((entry) => entry.itemId === itemId)
  const item = itemById(itemId)
  quantity = Math.max(1, Math.floor(quantity)); startingPrice = Math.max(10, Math.floor(startingPrice))
  if (auction.status !== 'OPEN' || !stack || stack.quantity < quantity) return { ok: false, reason: '物品或拍卖状态不符' }
  if (!item || marketCatalogEntry(itemId)?.tradeable === false || item.category === ItemCategory.QUEST) return { ok: false, reason: '此物不可交易' }
  if (player.boundArtifact?.artifactId === itemId || player.equipment.weapon === itemId || player.equipment.armor === itemId || player.equipment.accessory === itemId || player.equipment.artifactSlots.includes(itemId)) return { ok: false, reason: '已装备或绑定物品不可寄拍' }
  const listingFee = Math.max(1, Math.ceil(startingPrice * Math.max(.01, .02 - commerceSpread(player).auctionFeeDiscount)))
  if (player.spiritStones < listingFee) return { ok: false, reason: '寄拍费不足' }
  player.spiritStones -= listingFee; stack.quantity -= quantity; player.inventory = player.inventory.filter((entry) => entry.quantity > 0)
  auction.lots.push({ id: `${auction.id}:player:${auction.lots.length}`, itemId, quantity, startingPrice, currentPrice: startingPrice, sellerType: 'PLAYER', sellerId: player.id, bids: npcBids(world, itemId, startingPrice, rng), status: 'OPEN', remainingRounds: 3, reservedPlayerBid: 0 })
  return { ok: true, reason: '', listingFee }
}

export function settleAuction(player: Player, auction: AuctionState) {
  for (const lot of auction.lots) {
    if (lot.status !== 'OPEN') continue
    if (!lot.winnerId) {
      lot.status = 'UNSOLD'
      if (lot.sellerId === player.id) { const stack = player.inventory.find((entry) => entry.itemId === lot.itemId); if (stack) stack.quantity += lot.quantity; else player.inventory.push({ itemId: lot.itemId, quantity: lot.quantity }) }
    } else {
      lot.status = 'SOLD'
      if (lot.winnerId === player.id) { const stack = player.inventory.find((entry) => entry.itemId === lot.itemId); if (stack) stack.quantity += lot.quantity; else player.inventory.push({ itemId: lot.itemId, quantity: lot.quantity }); addProfessionExperience(player, 'COMMERCE', Math.max(2, Math.log10(lot.currentPrice + 1) * 4), true) }
      if (lot.sellerId === player.id) { const feeRate = Math.max(.032, .05 - commerceSpread(player).auctionFeeDiscount); player.spiritStones += Math.floor(lot.currentPrice * (1 - feeRate)); addProfessionExperience(player, 'COMMERCE', Math.max(2, Math.log10(lot.currentPrice + 1) * 5), true) }
    }
    const feeRate = lot.sellerId === player.id ? Math.max(.032, .05 - commerceSpread(player).auctionFeeDiscount) : .05
    const fee = lot.status === 'SOLD' ? Math.ceil(lot.currentPrice * feeRate) : 0
    const history = { id: `${auction.id}:record:${lot.id}`, year: auction.year, itemId: lot.itemId, quantity: lot.quantity, price: lot.currentPrice, winnerId: lot.winnerId, sellerId: lot.sellerId, status: lot.status, fee } as const
    auction.history.unshift(history); player.auctionHistory.unshift(history)
  }
  auction.history.splice(100); player.auctionHistory.splice(100); auction.status = 'SETTLED'
}
