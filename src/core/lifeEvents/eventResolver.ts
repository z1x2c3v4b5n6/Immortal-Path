import type { LifeEvent, Player, WorldState } from '../../models'
import { LIFE_EVENTS } from '../../data/lifeEvents'
import type { RandomService } from '../random/RandomService'
import { determineLifeStage, meetsEventCondition } from './eventCondition'
import { opportunityWeightMultiplier } from './eventRisk'

export function isLifeEventOnCooldown(event: LifeEvent, player: Player, currentYear: number) {
  const previous = [...player.lifeEventHistory].reverse().find((record) => record.eventId === event.id)
  return Boolean(previous && currentYear - previous.year < event.cooldown)
}

export function calculateLifeEventWeight(event: LifeEvent, player: Player, world: WorldState) {
  const luck = .75 + player.stats.luck / 200
  const insight = event.tags.includes('insight') ? .8 + player.stats.comprehension / 250 : 1
  const root = event.tags.some((tag) => tag.startsWith('element:') && meetsEventCondition({ type: 'ROOT_ELEMENT', value: tag.slice(8) }, player, world)) ? 1.25 : 1
  const talent = 1 + player.talents.flatMap((entry) => entry.effects).filter((effect) => effect.type === 'eventWeight').reduce((sum, effect) => sum + effect.value, 0)
  const fate = event.tags.some((tag) => player.fateTags.some((entry) => entry.id === tag || tag === `fate:${entry.id}`)) ? 1.5 : 1
  const path = player.primaryPath && event.tags.includes(`path:${player.primaryPath}`) ? 1.45 : 1
  const fatePathTags: Record<string, string[]> = {
    'sword-legend': ['sword', 'path:sword'],
    'five-elements-dao': ['five-elements'],
    'defy-destiny': ['danger', 'tribulation'],
    'demonic-overlord': ['demonic', 'path:demonic'],
    'longevity-road': ['longevity'],
  }
  const formedDestiny = player.fatePaths.some((entry) => entry.status === 'completed' && fatePathTags[entry.id]?.some((tag) => event.tags.includes(tag))) ? 1.35 : 1
  const worldMatch = event.tags.some((tag) => world.continent.traits.some((trait) => tag === `world:${trait.id}`)) ? 1.3 : 1
  const dangerWorld = event.riskLevel >= 2 ? world.continent.cultivationEnvironment.dangerMultiplier : 1
  const opportunity = opportunityWeightMultiplier(event, player)
  const traitAffinity = event.tags.includes('beast') && world.continent.traits.some((trait) => trait.id === 'beasts') ? 1.65 : event.tags.includes('demonic') && world.continent.traits.some((trait) => trait.id === 'demonic-rise') ? 1.65 : event.tags.includes('inheritance') && world.continent.traits.some((trait) => trait.id === 'ancient-ruins') ? 1.5 : 1
  return Number((event.weight * luck * insight * root * talent * fate * path * formedDestiny * worldMatch * dangerWorld * opportunity * traitAffinity).toFixed(3))
}

export interface WeightedLifeEvent { event: LifeEvent; weight: number }

export function checkLifeEvents(player: Player, world: WorldState, events?: LifeEvent[]): WeightedLifeEvent[]
export function checkLifeEvents(events: LifeEvent[], player: Player, world: WorldState): WeightedLifeEvent[]
export function checkLifeEvents(first: LifeEvent[] | Player, second: Player | WorldState, third?: WorldState | LifeEvent[]): WeightedLifeEvent[] {
  const events = Array.isArray(first) ? first : Array.isArray(third) ? third : LIFE_EVENTS
  const player = (Array.isArray(first) ? second : first) as Player
  const world = (Array.isArray(first) ? third : second) as WorldState
  const stage = determineLifeStage(player)
  return events.filter((event) => event.stage === stage && !isLifeEventOnCooldown(event, player, world.currentYear) && event.conditions.every((condition) => meetsEventCondition(condition, player, world))).map((event) => ({ event, weight: calculateLifeEventWeight(event, player, world) })).filter((entry) => entry.weight > 0)
}

export function selectLifeEvent(pool: WeightedLifeEvent[], rng: RandomService) {
  if (!pool.length) return undefined
  return rng.weightedRandom(pool.map((entry) => ({ value: entry.event, weight: entry.weight })))
}
