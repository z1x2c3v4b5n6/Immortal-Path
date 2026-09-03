import { REALMS } from '../../data/realms'
import type { Player, WorldState } from '../../models'
import { pathCultivationMultiplier, spiritRootDependency } from '../paths/paths'
import { techniqueById } from '../../data/techniques'
import { calculateTechniqueAffinity } from '../techniques/techniques'
import { isFiveElementImbalanced } from '../aptitude/aptitude'
import { cultivationStateMultiplier } from '../actions/actionEffects'

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
  const technique = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  const affinity = technique ? calculateTechniqueAffinity(player, technique, world) : undefined
  const techniqueLevel = technique ? player.techniqueProgress.find((entry) => entry.techniqueId === technique.id)?.level ?? 1 : 0
  const affinityScale = affinity ? Math.max(.08, Math.min(1.5, affinity.total / 100)) : 0
  const techniqueMultiplier = technique && affinity?.meetsMinimum ? (1 + (technique.baseCultivationEfficiency - 1) * affinityScale) * (1 + techniqueLevel * .01) : technique ? .72 : 1
  const acquiredMultiplier = player.acquiredTalents.some((talent) => talent.talentId === 'late-bloom') && player.ageMonths >= player.lifespanMonths * .6 ? 1.08 : 1
  const imbalanceMultiplier = technique && technique.elements.length > 1 && isFiveElementImbalanced(player.spiritualAptitude) && !player.acquiredTalents.some((talent) => talent.talentId === 'five-unity') ? .94 : 1
  const finalMultiplier = Math.max(.3, Math.min(3.6, rootMultiplier * talentMultiplier * comprehensionMultiplier * variance * pathMultiplier * techniqueMultiplier * acquiredMultiplier * imbalanceMultiplier * cultivationStateMultiplier(player)))
  return Math.max(1, Math.round(realm.cultivationBase * months * finalMultiplier))
}
