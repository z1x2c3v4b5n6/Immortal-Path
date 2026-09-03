import type { EventOutcome, EventRequirement, Player, WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'
import { getWorldModifier } from '../world/world'

export function meetsEventRequirement(player: Player, requirement?: EventRequirement): boolean {
  if (!requirement) return true
  if (requirement.realmIndex !== undefined && player.realmIndex < requirement.realmIndex) return false
  if (requirement.stat && requirement.min !== undefined && player.stats[requirement.stat] < requirement.min) return false
  return true
}

export function calculateOutcomeWeight(outcome: EventOutcome, player: Player, world?: WorldState): number {
  if (outcome.requirements?.some((requirement) => !meetsEventRequirement(player, requirement))) return 0
  let multiplier = 1
  const originValue = (type: string) => player.origin.modifiers.filter((modifier) => modifier.type === type).reduce((sum, modifier) => sum + modifier.value, 0)
  if (outcome.tags?.includes('rare')) {
    const talentWeight = player.talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'eventWeight').reduce((sum, effect) => sum + effect.value, 0)
    multiplier *= 1 + Math.max(0, player.stats.luck - 40) / 180 + talentWeight + originValue('hiddenEvent')
    if (world) multiplier *= 1 + getWorldModifier(world, 'rareEvent')
  }
  if (outcome.tags?.includes('insight')) multiplier *= 1 + Math.max(0, player.stats.comprehension - 40) / 220 + Math.max(0, player.stats.soul - 40) / 320 + originValue('insight')
  if (outcome.tags?.includes('danger')) multiplier *= Math.max(.2, 1 - originValue('adventureSafety')) * (world?.continent.cultivationEnvironment.dangerMultiplier ?? 1)
  return Math.max(0, outcome.weight * multiplier)
}

export function selectEventOutcome(outcomes: EventOutcome[], player: Player, rng: RandomService, world?: WorldState): EventOutcome {
  return rng.weightedRandom(outcomes.map((outcome) => ({ value: outcome, weight: calculateOutcomeWeight(outcome, player, world) })))
}
