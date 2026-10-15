import { describe, expect, it } from 'vitest'
import { advanceAuctionRound, consignAuctionItem, createAuction, initialAuctionState, placePlayerBid, settleAuction } from '../src/core/economy/auction'
import { RandomService, createSeededRandom } from '../src/core/random/RandomService'
import type { AuctionLot } from '../src/models'
import { playerFixture, worldFixture } from './fixtures'

function lot(overrides: Partial<AuctionLot> = {}): AuctionLot {
  return { id: 'lot', itemId: 'healing-pill', quantity: 1, startingPrice: 100, currentPrice: 100, sellerType: 'WORLD', bids: [], status: 'OPEN', remainingRounds: 3, reservedPlayerBid: 0, ...overrides }
}

describe('V7 world-year auction', () => {
  it('creates deterministic lots with real living world NPC bidders and fixed maximum bids', () => {
    const world = worldFixture()
    const auction = createAuction(world, createSeededRandom('auction-105'))
    expect(auction.status).toBe('OPEN')
    expect(auction.lots.length).toBeGreaterThan(0)
    for (const bid of auction.lots[0].bids) {
      expect(world.npcCultivators.some((npc) => npc.id === bid.bidderId && npc.alive)).toBe(true)
      expect(bid.maxBid).toBeGreaterThanOrEqual(auction.lots[0].startingPrice)
    }
  })

  it('freezes a player bid and releases it when an interested NPC outbids without exceeding maxBid', () => {
    const player = playerFixture({ spiritStones: 1000 })
    const target = lot({ bids: [{ bidderId: 'npc', bidderName: '韩玄', amount: 0, maxBid: 240, interest: .9, round: 0 }] })
    expect(placePlayerBid(player, target, 120).ok).toBe(true)
    expect(player.spiritStones).toBe(880)
    advanceAuctionRound(player, target)
    expect(player.spiritStones).toBe(1000)
    expect(target.winnerId).toBe('npc')
    expect(target.currentPrice).toBeLessThanOrEqual(240)
  })

  it('settles a player win into inventory without charging the frozen amount twice', () => {
    const player = playerFixture({ spiritStones: 500 })
    const target = lot()
    placePlayerBid(player, target, 120)
    target.remainingRounds = 0
    const auction = { ...initialAuctionState(105), id: 'a105', year: 105, status: 'OPEN' as const, lots: [target] }
    settleAuction(player, auction)
    expect(player.spiritStones).toBe(380)
    expect(player.inventory).toContainEqual({ itemId: 'healing-pill', quantity: 1 })
    expect(auction.history[0]).toMatchObject({ status: 'SOLD', winnerId: player.id })
  })

  it('consigns an inventory item to real NPCs, forbids self-bidding and pays proceeds minus nonzero fees', () => {
    const world = worldFixture()
    const player = playerFixture({ spiritStones: 100, inventory: [{ itemId: 'healing-pill', quantity: 2 }] })
    const auction = { ...initialAuctionState(105), id: 'a105', year: 105, status: 'OPEN' as const }
    const result = consignAuctionItem(player, auction, world, new RandomService(() => 0), 'healing-pill', 1, 50)
    expect(result.ok).toBe(true)
    expect(result.listingFee).toBeGreaterThan(0)
    const target = auction.lots[0]
    expect(target.bids).toHaveLength(Math.min(3, world.npcCultivators.filter((npc) => npc.alive).length))
    expect(placePlayerBid(player, target, 60).ok).toBe(false)
    target.winnerId = target.bids[0].bidderId; target.currentPrice = 80; target.remainingRounds = 0
    const afterListing = player.spiritStones
    settleAuction(player, auction)
    expect(player.spiritStones).toBeGreaterThan(afterListing)
    expect(player.spiritStones - afterListing).toBeLessThan(80)
    expect(player.auctionHistory[0].fee).toBeGreaterThan(0)
  })

  it('returns an unsold consignment and keeps equipped or bound items out', () => {
    const world = worldFixture(); const auction = { ...initialAuctionState(105), id: 'a105', year: 105, status: 'OPEN' as const }
    const player = playerFixture({ spiritStones: 1000, inventory: [{ itemId: 'healing-pill', quantity: 1 }] })
    expect(consignAuctionItem(player, auction, world, new RandomService(() => .99), 'healing-pill', 1, 9999).ok).toBe(true)
    auction.lots[0].bids = []; auction.lots[0].remainingRounds = 0
    settleAuction(player, auction)
    expect(player.inventory).toContainEqual({ itemId: 'healing-pill', quantity: 1 })

    const equipped = playerFixture({ spiritStones: 100, inventory: [{ itemId: 'green-edge-weapon', quantity: 1 }] })
    equipped.equipment.weapon = 'green-edge-weapon'
    expect(consignAuctionItem(equipped, { ...initialAuctionState(105), status: 'OPEN' }, world, new RandomService(() => 0), 'green-edge-weapon', 1, 100).ok).toBe(false)
  })
})
