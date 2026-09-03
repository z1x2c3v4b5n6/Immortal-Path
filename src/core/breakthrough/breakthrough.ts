import { REALMS, isMajorBreakthrough } from '../../data/realms'
import { techniqueById } from '../../data/techniques'
import { CharacterState, type CultivationResources, type Player, type WorldState } from '../../models'
import { isFiveElementImbalanced } from '../aptitude/aptitude'
import { breakthroughStateModifier } from '../actions/actionEffects'
import { getSpiritRootBreakthroughModifier } from '../spiritRoot/spiritRoot'
import { calculateTechniqueAffinity } from '../techniques/techniques'
import { getWorldModifier } from '../world/world'

export interface BreakthroughChance {
  base: number
  spiritRoot: number
  comprehension: number
  luck: number
  talent: number
  technique: number
  path: number
  state: number
  environment: number
  final: number
}

export interface BreakthroughRequirements {
  cultivationReady: boolean
  techniqueReady: boolean
  resourcesReady: boolean
  stateReady: boolean
  progressReady: boolean
  techniqueLevel: number
  requiredTechniqueLevel: number
  resourceCost: CultivationResources
  missing: string[]
  ready: boolean
}

export function breakthroughResourceCost(player: Player): CultivationResources {
  const nextIndex = player.realmIndex + 1
  if (!isMajorBreakthrough(nextIndex) || nextIndex <= 1) return { spiritHerbs: 0, beastCores: 0, bodyMaterials: 0, soulCrystals: 0 }
  const tier = Math.max(1, Math.ceil(nextIndex / 10))
  return {
    spiritHerbs: tier,
    beastCores: player.primaryPath === 'demonic' ? tier : Math.max(0, tier - 1),
    bodyMaterials: player.primaryPath === 'body' ? tier * 2 : 0,
    soulCrystals: player.primaryPath === 'ghost' ? tier * 2 : 0,
  }
}

export function checkBreakthroughRequirements(player: Player): BreakthroughRequirements {
  const nextIndex = player.realmIndex + 1
  const activeId = player.activeTechnique ?? player.knownTechniques[0]
  const techniqueLevel = activeId ? player.techniqueProgress.find((entry) => entry.techniqueId === activeId)?.level ?? 1 : 0
  const requiredTechniqueLevel = isMajorBreakthrough(nextIndex) && nextIndex > 1 ? Math.min(10, 2 + Math.floor(nextIndex / 8)) : 1
  const resourceCost = breakthroughResourceCost(player)
  const cultivationReady = player.cultivation >= player.cultivationRequired
  const techniqueReady = techniqueLevel >= requiredTechniqueLevel
  const resourcesReady = (Object.keys(resourceCost) as (keyof CultivationResources)[]).every((key) => player.resources[key] >= resourceCost[key])
  const stateReady = !player.characterStates.includes(CharacterState.SERIOUS_INJURY)
  const progressReady = player.breakthroughProgress >= 100
  const missing = [!cultivationReady ? '修为尚未圆满' : '', !techniqueReady ? `主修功法需达到 Lv.${requiredTechniqueLevel}` : '', !resourcesReady ? '突破资源不足' : '', !stateReady ? '重伤状态无法突破' : '', !progressReady ? `突破准备仅 ${Math.floor(player.breakthroughProgress)}%` : ''].filter(Boolean)
  return { cultivationReady, techniqueReady, resourcesReady, stateReady, progressReady, techniqueLevel, requiredTechniqueLevel, resourceCost, missing, ready: player.alive && player.realmIndex < REALMS.length - 1 && !missing.length }
}

export function consumeBreakthroughResources(player: Player) {
  const cost = breakthroughResourceCost(player)
  for (const key of Object.keys(cost) as (keyof CultivationResources)[]) player.resources[key] = Math.max(0, player.resources[key] - cost[key])
  return cost
}

export function calculateBreakthroughChance(player: Player, world?: WorldState): BreakthroughChance {
  const base = REALMS[player.realmIndex].breakthroughBaseChance
  const spiritRoot = getSpiritRootBreakthroughModifier(player.spiritRoot)
  const comprehension = (player.stats.comprehension - 50) * .002
  const luck = (player.stats.luck - 50) * .0009
  const talent = player.talents.reduce((sum, entry) => sum + entry.effects.filter((effect) => effect.type === 'breakthroughBonus').reduce((value, effect) => value + effect.value, 0), 0)
  const path = player.primaryPath === 'dao' ? .025 : player.primaryPath === 'body' ? (player.stats.constitution - 50) * .0015 : player.primaryPath === 'sword' ? Math.min(.08, player.pathResources.swordIntent / 1500) : player.primaryPath === 'demonic' ? -.035 - player.pathResources.innerDemon * .0007 : player.primaryPath === 'ghost' ? ((player.soulStability ?? 50) - 50) * .001 : 0
  const environment = world ? getWorldModifier(world, 'breakthrough') : 0
  const activeTechnique = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  const technique = activeTechnique ? -calculateTechniqueAffinity(player, activeTechnique, world).riskModifier * .08 : 0
  const state = breakthroughStateModifier(player)
  const fiveUnity = player.acquiredTalents.some((entry) => entry.talentId === 'five-unity') && isMajorBreakthrough(player.realmIndex + 1) ? .08 : 0
  const imbalance = isFiveElementImbalanced(player.spiritualAptitude) && isMajorBreakthrough(player.realmIndex + 1) && !fiveUnity ? -.025 : 0
  const final = Math.max(.08, Math.min(.96, base + spiritRoot + comprehension + luck + talent + path + environment + technique + state + fiveUnity + imbalance))
  return { base, spiritRoot, comprehension, luck, talent, technique, path, state, environment, final }
}

export function canBreakthrough(player: Player) {
  return checkBreakthroughRequirements(player).ready
}
