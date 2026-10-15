import { describe, expect, it } from 'vitest'
import { simulateEconomy } from '../src/core/economy/economySimulation'
import { initialMarketState, refreshMarket, supplyDemand } from '../src/core/economy/market'
import { baseItemValue, calculateMarketPrice, PRICE_MAX, PRICE_MIN, volumeAdjustedTotal } from '../src/core/economy/pricing'
import { buyMarketItem, sellMarketItem } from '../src/core/economy/trade'
import { createSeededRandom } from '../src/core/random/RandomService'
import { initialProfessionProgress } from '../src/core/professions/professions'
import type { MarketListing } from '../src/models'
import { playerFixture, worldFixture } from './fixtures'

const listing = (): MarketListing => ({ listingId: 'healing', itemId: 'healing-pill', quantity: 20, buyPrice: 150, sellPrice: 100, merchantType: '丹药商', refreshYear: 100, trend: 0, reasons: [] })

describe('V7 dynamic market', () => {
  it('uses explicit base values and explains world-event increases', () => {
    const world = worldFixture({ worldEvents: [{ id: 'war', year: 100, text: '青云剑宗与血煞宗开战' }] })
    const calm = worldFixture({ worldEvents: [] })
    const state = { itemId: 'healing-pill', supply: 100, demand: 100, trend: 0, lastUpdatedYear: 100 }
    expect(baseItemValue('healing-pill')).toBe(150)
    const wartime = calculateMarketPrice('healing-pill', state, world, '丹药商')
    expect(wartime.buyPrice).toBeGreaterThan(calculateMarketPrice('healing-pill', state, calm, '丹药商').buyPrice)
    expect(wartime.reasons.some((reason) => reason.label === '宗门战争')).toBe(true)
  })

  it('clamps price modifiers and always preserves a buy/sell spread', () => {
    const world = worldFixture()
    const player = playerFixture({ professionProgress: initialProfessionProgress() })
    player.professionProgress.find((entry) => entry.id === 'COMMERCE')!.level = 100
    const high = calculateMarketPrice('healing-pill', { itemId: 'healing-pill', supply: 0, demand: 1000, trend: 1, lastUpdatedYear: 100 }, world, '黑市商人', player)
    const low = calculateMarketPrice('healing-pill', { itemId: 'healing-pill', supply: 1000, demand: 0, trend: -1, lastUpdatedYear: 100 }, world, '灵药商', player)
    expect(high.modifier).toBeLessThanOrEqual(PRICE_MAX)
    expect(low.modifier).toBeGreaterThanOrEqual(PRICE_MIN)
    expect(high.sellPrice).toBeLessThan(high.buyPrice)
  })

  it('creates deterministic finite stock and cannot refresh repeatedly in one year', () => {
    const world = worldFixture()
    const market = initialMarketState(100)
    expect(refreshMarket(market, world, createSeededRandom('market-100'), playerFixture())).toBe(true)
    const snapshot = JSON.stringify(market.listings)
    expect(market.listings.length).toBeGreaterThan(0)
    expect(market.listings.every((entry) => entry.quantity > 0)).toBe(true)
    expect(refreshMarket(market, world, createSeededRandom('market-100'), playerFixture())).toBe(false)
    expect(JSON.stringify(market.listings)).toBe(snapshot)
  })

  it('buys into inventory, sells from inventory, changes price, and cannot arbitrage', () => {
    const world = worldFixture()
    const market = initialMarketState(100); market.listings = [listing()]
    const player = playerFixture({ spiritStones: 1000 })
    const before = player.spiritStones
    const bought = buyMarketItem(player, market, world, 'healing', 3)
    expect(bought.ok).toBe(true)
    expect(player.inventory.find((entry) => entry.itemId === 'healing-pill')?.quantity).toBe(3)
    expect(market.listings[0].quantity).toBe(17)
    const sold = sellMarketItem(player, market, world, 'healing', 3)
    expect(sold.ok).toBe(true)
    expect(player.spiritStones).toBeLessThan(before)
    expect(player.tradeHistory).toHaveLength(2)
    expect(supplyDemand(market, 'healing-pill').trend).toBeCloseTo(0)
  })

  it('applies volume impact and commerce experience diminishes for repeated low-value trades', () => {
    expect(volumeAdjustedTotal(100, 10, 'BUY')).toBeGreaterThan(1000)
    expect(volumeAdjustedTotal(100, 10, 'SELL')).toBeLessThan(1000)
    const world = worldFixture(); const market = initialMarketState(100); market.listings = [{ ...listing(), itemId: 'green-spirit-herb', buyPrice: 2, sellPrice: 1, quantity: 99 }]
    const player = playerFixture({ spiritStones: 100, inventory: [] })
    const commerce = player.professionProgress.find((entry) => entry.id === 'COMMERCE')!
    buyMarketItem(player, market, world, 'healing', 1); const first = commerce.experience
    buyMarketItem(player, market, world, 'healing', 1); const second = commerce.experience - first
    buyMarketItem(player, market, world, 'healing', 1); const third = commerce.experience - first - second
    expect(second).toBeLessThanOrEqual(first)
    expect(third).toBeLessThanOrEqual(second)
  })

  it('recovers supply and demand annually and remains idempotent in one year', () => {
    const world = worldFixture({ currentYear: 101 })
    const market = initialMarketState(100); const state = supplyDemand(market, 'healing-pill'); state.supply = 40; state.demand = 170
    const economy = { marketIndex: 1, aggregateDemand: {}, lastSimulatedYear: 100 }
    expect(simulateEconomy(economy, market, world)).toBe(true)
    expect(state.supply).toBeGreaterThan(40)
    expect(state.demand).toBeLessThanOrEqual(180)
    expect(simulateEconomy(economy, market, world)).toBe(false)
  })
})
