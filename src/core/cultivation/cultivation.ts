import { REALMS } from '../../data/realms'
import type { Player, WorldState } from '../../models'
import { pathCultivationMultiplier, spiritRootDependency } from '../paths/paths'

export function calculateCultivationGain(player: Player, months: number, world?: WorldState): number {
  const realm = REALMS[player.realmIndex]
  const talentBonus = player.talents.reduce((sum, talent) => {
    const base = talent.effects.filter((effect) => effect.type === 'cultivationMultiplier').reduce((value, effect) => value + effect.value, 0)
    if (talent.id === 'early' && player.ageMonths >= 40 * 12) return sum
    if (talent.id === 'late' && player.ageMonths < 50 * 12) return sum - .06
    return sum + base
  }, 0)
  const originBonus = player.origin.modifiers.filter((modifier) => modifier.type === 'cultivation').reduce((sum, modifier) => sum + modifier.value, 0)
  const talentMultiplier = 1 + talentBonus + originBonus
  const comprehensionMultiplier = 0.72 + player.stats.comprehension / 100
  const variance = 0.92 + ((player.stats.luck % 11) / 100)
  const rootDependency = spiritRootDependency(player.primaryPath)
  const rootMultiplier = 1 + (player.spiritRoot.cultivationMultiplier - 1) * rootDependency
  const pathMultiplier = pathCultivationMultiplier(player, world)
  const finalMultiplier = Math.max(.55, Math.min(3, rootMultiplier * talentMultiplier * comprehensionMultiplier * variance * pathMultiplier))
  return Math.max(1, Math.round(realm.cultivationBase * months * finalMultiplier))
}
