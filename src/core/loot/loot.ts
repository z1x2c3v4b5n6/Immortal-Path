import { ITEMS } from '../../data/items'
import { LOOT_WEIGHTS, PITY_CONFIG, QUALITY_ORDER } from '../../data/lootTables'
import { REALMS } from '../../data/realms'
import type { ItemDefinition, PityState, Player } from '../../models'
import type { RandomService, Weighted } from '../random/RandomService'

export interface LootResult { item: ItemDefinition; pity: PityState; weights: Weighted<string>[] }

export function rollLoot(player: Player, pity: PityState, fortunate: boolean, rng: RandomService, resourceMultiplier = 1): LootResult {
  const realm = REALMS[player.realmIndex]
  const base = LOOT_WEIGHTS[realm.group]
  const weights = QUALITY_ORDER.map((quality, index) => {
    let weight = base[index]
    const highTier = index >= 3
    if (highTier) weight *= 1 + player.stats.luck / 260
    if (highTier) weight *= Math.max(.65, Math.min(1.55, resourceMultiplier))
    if (highTier && fortunate) weight *= PITY_CONFIG.fortunateMultiplier
    if (index >= 3 && pity.rollsWithoutRare >= PITY_CONFIG.rareAfter) weight *= PITY_CONFIG.rareBoost
    if (index >= 4 && pity.rollsWithoutEpic >= PITY_CONFIG.epicGuaranteeAt) weight += 10000
    return { value: quality, weight }
  })
  const quality = rng.weightedRandom(weights)
  const candidates = ITEMS.filter((item) => item.quality === quality && (item.requiredRealmIndex ?? 0) <= player.realmIndex + 4)
  const fallback = ITEMS.filter((item) => (item.requiredRealmIndex ?? 0) <= player.realmIndex + 4)
  const item = rng.pick(candidates.length ? candidates : fallback)
  const qualityIndex = QUALITY_ORDER.indexOf(item.quality)
  return {
    item,
    weights,
    pity: {
      rollsWithoutRare: qualityIndex >= 3 ? 0 : pity.rollsWithoutRare + 1,
      rollsWithoutEpic: qualityIndex >= 4 ? 0 : pity.rollsWithoutEpic + 1,
    },
  }
}
