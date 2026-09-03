import { ACQUIRED_TALENTS, type AcquiredTalentDefinition, type AcquiredTalentRequirement } from '../../data/acquiredTalents'
import type { AcquiredTalentInstance, Player } from '../../models'
import { calculateFiveElementBalance, hasFiveElementFoundation } from '../aptitude/aptitude'
import { STANDARD_ELEMENTS } from '../../data/spiritRoots'

function meetsRequirement(player: Player, requirement: AcquiredTalentRequirement) {
  if (requirement.type === 'fiveElementBalance') return hasFiveElementFoundation(player.spiritualAptitude) && calculateFiveElementBalance(player.spiritualAptitude) >= requirement.value
  if (requirement.type === 'allStandardGrowth') return STANDARD_ELEMENTS.every((element) => player.spiritualAptitude.elementalGrowth[element] >= requirement.value)
  if (requirement.type === 'innateRootCount') return player.spiritualAptitude.innateRoot.elements.length === requirement.value
  if (requirement.type === 'realmIndex') return player.realmIndex >= requirement.value
  if (requirement.type === 'primaryPath') return player.primaryPath === requirement.pathId
  if (requirement.type === 'stat') return player.stats[requirement.stat] >= requirement.value
  if (requirement.type === 'pathLevel') return (player.pathProgress.find((progress) => progress.pathId === requirement.pathId)?.level ?? 0) >= requirement.value
  if (requirement.type === 'counter') return player[requirement.key] >= requirement.value
  if (requirement.type === 'pathResource') {
    const value = player.pathResources[requirement.key]
    return (requirement.min === undefined || value >= requirement.min) && (requirement.max === undefined || value <= requirement.max)
  }
  return false
}

export function canUnlockAcquiredTalent(player: Player, definition: AcquiredTalentDefinition, eventId?: string) {
  return !player.acquiredTalents.some((talent) => talent.talentId === definition.id) && (!definition.requiresEvent || definition.requiresEvent === eventId) && definition.requirements.every((requirement) => meetsRequirement(player, requirement))
}

export function checkAcquiredTalentUnlocks(player: Player, year: number, month: number, eventId?: string): AcquiredTalentInstance[] {
  const unlocked = ACQUIRED_TALENTS.filter((definition) => canUnlockAcquiredTalent(player, definition, eventId)).map((definition) => ({ talentId: definition.id, name: definition.name, acquiredYear: year, acquiredMonth: month, source: eventId ? `事件：${eventId}` : '修行积累' }))
  player.acquiredTalents.push(...unlocked)
  return unlocked
}
