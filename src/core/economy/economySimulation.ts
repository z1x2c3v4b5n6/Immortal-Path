import type { EconomyState, MarketState, WorldState } from '../../models'
import { supplyDemand } from './market'

export const initialEconomyState = (year = 100): EconomyState => ({ marketIndex: 1, aggregateDemand: {}, lastSimulatedYear: year })

export function simulateEconomy(economy: EconomyState, market: MarketState, world: WorldState) {
  if (world.currentYear <= economy.lastSimulatedYear) return false
  const years = world.currentYear - economy.lastSimulatedYear
  const foundationCultivators = world.npcCultivators.filter((npc) => npc.alive && npc.realmIndex >= 11 && npc.realmIndex < 15).length
  economy.aggregateDemand = { 'foundation-pill': foundationCultivators * 2, 'healing-pill': world.worldEvents.some((event) => /大战|兽潮/.test(event.text)) ? 30 : 8 }
  for (const state of market.supplyDemand) {
    const recovery = Math.min(1, years * .18)
    state.supply += (100 - state.supply) * recovery
    state.demand += (100 + (economy.aggregateDemand[state.itemId] ?? 0) - state.demand) * recovery
    state.trend *= Math.max(0, 1 - recovery)
    state.lastUpdatedYear = world.currentYear
  }
  for (const [itemId, demand] of Object.entries(economy.aggregateDemand)) supplyDemand(market, itemId).demand = Math.min(180, 100 + demand)
  economy.marketIndex = Math.max(.75, Math.min(1.5, world.continent.cultivationEnvironment.resourceMultiplier / world.continent.cultivationEnvironment.spiritualQiMultiplier))
  economy.lastSimulatedYear = world.currentYear
  market.rumors = world.worldEvents.slice(0, 5).flatMap((event) => /大战|兽潮|丰收|秘境/.test(event.text) ? [{ id: event.id, text: event.text, tags: /兽潮/.test(event.text) ? ['疗伤', '武器', '妖兽材料'] : /大战/.test(event.text) ? ['疗伤', '武器', '防具'] : /秘境/.test(event.text) ? ['破禁', '疗伤'] : ['灵药', '丹药'], modifier: /丰收/.test(event.text) ? -.16 : .16, expiresYear: event.year + 8 }] : []).filter((rumor) => rumor.expiresYear >= world.currentYear)
  return true
}
