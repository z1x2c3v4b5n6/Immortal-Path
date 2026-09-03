import { LifeStage, type EventCondition, type Player, type WorldState } from '../../models'

export function determineLifeStage(player: Player): LifeStage {
  const age = player.ageMonths / 12
  if (age >= player.lifespanMonths / 12 * .8) return LifeStage.OLD_AGE
  if (age < 13) return LifeStage.CHILDHOOD
  if (age < 18) return LifeStage.TEENAGE
  if (player.realmIndex === 0) return LifeStage.MORTAL
  if (player.realmIndex <= 10) return LifeStage.EARLY_CULTIVATION
  if (player.realmIndex <= 26) return LifeStage.MID_CULTIVATION
  return LifeStage.LATE_CULTIVATION
}

export function meetsEventCondition(condition: EventCondition, player: Player, world: WorldState) {
  const age = Math.floor(player.ageMonths / 12)
  if (condition.type === 'MIN_AGE') return age >= Number(condition.value)
  if (condition.type === 'MAX_AGE') return age <= Number(condition.value)
  if (condition.type === 'MIN_REALM') return player.realmIndex >= Number(condition.value)
  if (condition.type === 'MAX_REALM') return player.realmIndex <= Number(condition.value)
  if (condition.type === 'PATH') return player.primaryPath === condition.value
  if (condition.type === 'ROOT_ELEMENT') return player.spiritualAptitude.innateRoot.elements.includes(condition.value as Player['spiritRoot']['elements'][number]) || player.spiritualAptitude.acquiredRoots.some((root) => root.element === condition.value)
  if (condition.type === 'TALENT') return player.talents.some((talent) => talent.id === condition.value)
  if (condition.type === 'ACQUIRED_TALENT') return player.acquiredTalents.some((talent) => talent.talentId === condition.value)
  if (condition.type === 'FATE_TAG') return player.fateTags.some((tag) => tag.id === condition.value)
  if (condition.type === 'NOT_FATE_TAG') return !player.fateTags.some((tag) => tag.id === condition.value)
  if (condition.type === 'HISTORY_TAG') return player.lifeEventHistory.some((record) => record.tags.includes(String(condition.value)))
  if (condition.type === 'WORLD_TRAIT') return world.continent.traits.some((trait) => trait.id === condition.value)
  if (condition.type === 'MIN_STAT' && condition.stat) return player.stats[condition.stat] >= Number(condition.value)
  return true
}
