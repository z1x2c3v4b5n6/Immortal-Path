import type { DeathCauseCategory, EventChoice, LifeEvent, Player, WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'

export type RiskOutcome = 'safe' | 'injured' | 'severe-injury' | 'death' | 'turning-point'

export interface EventRiskAssessment {
  riskLevel: 0 | 1 | 2 | 3 | 4
  rewardLevel: 1 | 2 | 3 | 4
  deathChance: number
  injuryChance: number
  severeInjuryChance: number
  rareRewardChance: number
  turningPointChance: number
  realmGap: number
}

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))

export const riskLevelName = (level: number) => ['安全', '低危', '危险', '高危', '九死一生'][clamp(Math.round(level), 0, 4)]
export const rewardLevelName = (level: number) => ['普通', '普通', '稀有', '珍贵', '传奇'][clamp(Math.round(level), 0, 4)]
export const riskStars = (level: number) => `${'★'.repeat(clamp(Math.round(level), 0, 4))}${'☆'.repeat(5 - clamp(Math.round(level), 0, 4))}`

export function eventDeathCategory(event: Pick<LifeEvent, 'dangerTags'>): DeathCauseCategory {
  if (event.dangerTags.includes('possession')) return 'possession'
  if (event.dangerTags.includes('soul-dispersal')) return 'soul-dispersal'
  if (event.dangerTags.includes('inner-demon')) return 'inner-demon'
  if (event.dangerTags.includes('restriction')) return 'restriction'
  if (event.dangerTags.includes('breakthrough')) return 'breakthrough'
  if (event.dangerTags.includes('combat')) return 'combat'
  return 'adventure'
}

export function calculateRewardLevel(event: LifeEvent, player: Player, choice?: EventChoice): 1 | 2 | 3 | 4 {
  const fortune = player.stats.luck >= 85 ? 1 : player.stats.luck <= 25 ? -1 : 0
  return clamp(Math.round(event.rewardLevel + (choice?.rewardModifier ?? 0) + fortune), 1, 4) as 1 | 2 | 3 | 4
}

export function calculateEventRisk(event: LifeEvent, player: Player, world: WorldState, choice?: EventChoice): EventRiskAssessment {
  const choiceRisk = choice?.riskModifier ?? (choice?.id === 'leave' ? 0 : 1)
  const riskLevel = clamp(Math.round(event.riskLevel * choiceRisk), 0, 4) as 0 | 1 | 2 | 3 | 4
  const rewardLevel = calculateRewardLevel(event, player, choice)
  if (riskLevel === 0) return { riskLevel, rewardLevel, deathChance: 0, injuryChance: 0, severeInjuryChance: 0, rareRewardChance: .03 * rewardLevel, turningPointChance: .02, realmGap: 0 }
  const realmGap = Math.max(0, (event.recommendedRealmIndex ?? player.realmIndex) - player.realmIndex)
  const danger = world.continent.cultivationEnvironment.dangerMultiplier
  const luck = player.stats.luck
  const survivalTurn = clamp((luck - 50) * .006, -.28, .32)
  const pathGuard = player.primaryPath === 'body' ? .12 : player.primaryPath === 'sword' ? .05 : player.primaryPath === 'ghost' ? Math.max(-.08, ((player.soulStability ?? 50) - 50) * .002) : 0
  const deathBase = [0, .002, .025, .085, .2][riskLevel]
  const severeBase = [0, .04, .13, .28, .42][riskLevel]
  const injuryBase = [0, .11, .25, .38, .48][riskLevel]
  const difficulty = 1 + realmGap * .2
  const deathCap = clamp(.48 - Math.max(0, survivalTurn) * .15, .4, .48)
  const deathChance = clamp(deathBase * danger * difficulty * (1 - survivalTurn - pathGuard), 0, deathCap)
  const severeInjuryChance = clamp(severeBase * danger * difficulty * (1 - survivalTurn * .65 - pathGuard), 0, .72)
  const injuryChance = clamp(injuryBase * danger * difficulty * (1 - survivalTurn * .35), 0, .82)
  const rareRewardChance = clamp(.05 + rewardLevel * .12 + Math.max(0, luck - 50) * .004 + riskLevel * .04, .05, .92)
  const turningPointChance = clamp(.03 + Math.max(0, luck - 45) * .004 + Math.max(0, player.stats.charm - 60) * .002, .03, .55)
  return { riskLevel, rewardLevel, deathChance, injuryChance, severeInjuryChance, rareRewardChance, turningPointChance, realmGap }
}

export function resolveEventRisk(assessment: EventRiskAssessment, rng: RandomService): RiskOutcome {
  if (assessment.riskLevel === 0) return rng.chance(assessment.turningPointChance) ? 'turning-point' : 'safe'
  if (rng.chance(assessment.deathChance)) return 'death'
  if (rng.chance(assessment.turningPointChance)) return 'turning-point'
  if (rng.chance(assessment.severeInjuryChance)) return 'severe-injury'
  if (rng.chance(assessment.injuryChance)) return 'injured'
  return 'safe'
}

export function opportunityWeightMultiplier(event: LifeEvent, player: Player) {
  const luck = player.stats.luck
  if (event.rewardLevel >= 3) return clamp(.65 + luck / 100, .7, 1.7)
  if (event.riskLevel >= 3) return clamp(1.25 - luck / 180, .7, 1.2)
  return 1
}
