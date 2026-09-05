import { REALMS, isMajorBreakthrough } from '../../data/realms'
import { techniqueById } from '../../data/techniques'
import { CharacterState, type CultivationResources, type Player, type WorldState } from '../../models'
import { BODY_REALM_ORDER } from '../actions/action'
import { breakthroughStateModifier } from '../actions/actionEffects'
import { getSpiritRootBreakthroughModifier } from '../spiritRoot/spiritRoot'
import { calculateTechniqueAffinity } from '../techniques/techniques'
import { getWorldModifier } from '../world/world'

export interface BreakthroughOptions {
  useAuxiliaries?: boolean
  useDemonicSacrifice?: boolean
}

export interface BreakthroughAid {
  bonus: number
  itemIds: string[]
  resources: CultivationResources
  lifespanMonths: number
  demonicNature: number
  descriptions: string[]
}

export interface BreakthroughChance {
  isMajor: boolean
  base: number
  spiritRoot: number
  comprehension: number
  luck: number
  talent: number
  technique: number
  path: number
  state: number
  environment: number
  preparation: number
  auxiliary: number
  final: number
  aid: BreakthroughAid
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

const emptyResources = (): CultivationResources => ({ spiritHerbs: 0, beastCores: 0, bodyMaterials: 0, soulCrystals: 0 })

export function breakthroughResourceCost(player: Player): CultivationResources {
  const nextIndex = player.realmIndex + 1
  if (!isMajorBreakthrough(nextIndex) || nextIndex <= 1) return emptyResources()
  const tier = Math.max(1, Math.ceil(nextIndex / 10))
  return {
    spiritHerbs: Math.min(3, tier),
    beastCores: player.primaryPath === 'demonic' ? Math.min(3, tier) : Math.min(2, Math.max(0, tier - 1)),
    bodyMaterials: player.primaryPath === 'body' ? Math.min(3, tier + 1) : 0,
    soulCrystals: player.primaryPath === 'ghost' ? Math.min(3, tier + 1) : 0,
  }
}

export function calculateBreakthroughAid(player: Player, options: BreakthroughOptions = {}): BreakthroughAid {
  const aid: BreakthroughAid = { bonus: 0, itemIds: [], resources: emptyResources(), lifespanMonths: 0, demonicNature: 0, descriptions: [] }
  if (options.useAuxiliaries) {
    const target = REALMS[player.realmIndex + 1]
    const foundationPill = target?.group === '筑基' ? player.inventory.find((entry) => entry.itemId === 'foundation-pill' && entry.quantity > 0) : undefined
    if (foundationPill) { aid.itemIds.push('foundation-pill'); aid.bonus += .2; aid.descriptions.push('筑基丹 +20%') }
    const preferred = breakthroughResourceCost(player)
    aid.resources.spiritHerbs = Math.min(player.resources.spiritHerbs, preferred.spiritHerbs)
    aid.resources.beastCores = Math.min(player.resources.beastCores, preferred.beastCores)
    aid.resources.bodyMaterials = Math.min(player.resources.bodyMaterials, preferred.bodyMaterials)
    aid.resources.soulCrystals = Math.min(player.resources.soulCrystals, preferred.soulCrystals)
    const herbBonus = aid.resources.spiritHerbs * .018
    const coreBonus = aid.resources.beastCores * .015
    const bodyBonus = aid.resources.bodyMaterials * .022
    const soulBonus = aid.resources.soulCrystals * .022
    aid.bonus += herbBonus + coreBonus + bodyBonus + soulBonus
    if (herbBonus) aid.descriptions.push(`灵药 +${Math.round(herbBonus * 100)}%`)
    if (coreBonus) aid.descriptions.push(`妖丹 +${Math.round(coreBonus * 100)}%`)
    if (bodyBonus) aid.descriptions.push(`炼体材料 +${Math.round(bodyBonus * 100)}%`)
    if (soulBonus) aid.descriptions.push(`魂晶 +${Math.round(soulBonus * 100)}%`)
  }
  const canSacrifice = player.primaryPath === 'demonic' && player.pathResources.demonicNature >= 10 && player.lifespanMonths - player.ageMonths > 72
  if (options.useDemonicSacrifice && canSacrifice) {
    aid.bonus += .15
    aid.lifespanMonths = 60
    aid.demonicNature = 10
    aid.descriptions.push('血祭寿元与魔性 +15%')
  }
  aid.bonus = Math.min(.35, aid.bonus)
  return aid
}

export function consumeBreakthroughAid(player: Player, aid: BreakthroughAid) {
  for (const itemId of aid.itemIds) {
    const stack = player.inventory.find((entry) => entry.itemId === itemId)
    if (stack) stack.quantity--
  }
  player.inventory = player.inventory.filter((entry) => entry.quantity > 0)
  for (const key of Object.keys(aid.resources) as (keyof CultivationResources)[]) player.resources[key] = Math.max(0, player.resources[key] - aid.resources[key])
  player.lifespanBonusMonths -= aid.lifespanMonths
  player.pathResources.demonicNature = Math.max(0, player.pathResources.demonicNature - aid.demonicNature)
  return aid
}

/** Backward-compatible helper: optional resources are consumed only when explicitly called. */
export function consumeBreakthroughResources(player: Player) {
  return consumeBreakthroughAid(player, calculateBreakthroughAid(player, { useAuxiliaries: true }))
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
  const missing = !player.alive ? ['人物已死亡'] : nextIndex >= REALMS.length ? ['已至此界极境'] : !cultivationReady ? ['修为尚未圆满'] : []
  return { cultivationReady, techniqueReady, resourcesReady, stateReady, progressReady, techniqueLevel, requiredTechniqueLevel, resourceCost, missing, ready: !missing.length }
}

export function majorBreakthroughBaseChance(targetGroup: string) {
  const chances: Record<string, number> = { 炼气: .78, 筑基: .60, 金丹: .45, 元婴: .35, 化神: .28, 炼虚: .23, 合体: .19, 大乘: .15, 渡劫: .12 }
  return chances[targetGroup] ?? .1
}

export function calculateBreakthroughChance(player: Player, world?: WorldState, options: BreakthroughOptions = {}): BreakthroughChance {
  const nextIndex = player.realmIndex + 1
  const target = REALMS[nextIndex]
  const major = isMajorBreakthrough(nextIndex)
  const base = major ? majorBreakthroughBaseChance(target?.group ?? '') : Math.max(.9, .98 - Math.floor(nextIndex / 8) * .01)
  const spiritRoot = getSpiritRootBreakthroughModifier(player.spiritRoot)
  const comprehension = (player.stats.comprehension - 50) * (major ? .0018 : .00045)
  const luck = (player.stats.luck - 50) * (major ? .0011 : .0003)
  const innateTalent = player.talents.reduce((sum, entry) => sum + entry.effects.filter((effect) => effect.type === 'breakthroughBonus').reduce((value, effect) => value + effect.value, 0), 0)
  const acquiredTalent = player.acquiredTalents.reduce((sum, entry) => sum + (entry.talentId === 'five-unity' && major ? .08 : 0), 0)
  const talent = innateTalent + acquiredTalent
  const activeTechnique = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  const affinity = activeTechnique ? calculateTechniqueAffinity(player, activeTechnique, world) : undefined
  const technique = affinity ? Math.max(-.08, Math.min(.14, (affinity.total - 40) * .002)) : 0
  const bodyRealmIndex = Math.max(0, BODY_REALM_ORDER.indexOf(player.bodyRealm))
  const path = player.primaryPath === 'dao' ? .03
    : player.primaryPath === 'sword' ? Math.min(.13, player.pathResources.swordIntent / 1100 + Math.max(0, player.stats.comprehension - 50) * .0005)
      : player.primaryPath === 'body' ? Math.min(.14, bodyRealmIndex * .018 + Math.max(0, player.stats.constitution - 50) * .0012)
        : player.primaryPath === 'demonic' ? Math.min(.1, player.pathResources.demonicNature * .001)
          : player.primaryPath === 'ghost' ? Math.max(-.05, Math.min(.14, ((player.soulStability ?? 50) - 50) * .0015 + Math.max(0, player.stats.soul - 50) * .001)) : 0
  const friendGuard = player.fateTags.some((tag) => tag.id === 'FRIEND_GUARDED_BREAKTHROUGH') ? .05 : 0
  const environment = (world ? getWorldModifier(world, 'breakthrough') : 0) + friendGuard
  const state = breakthroughStateModifier(player)
  const preparation = Math.min(.1, Math.max(0, player.breakthroughProgress) * .001)
  const aid = calculateBreakthroughAid(player, options)
  const auxiliary = aid.bonus
  const total = base + spiritRoot + comprehension + luck + talent + technique + path + environment + state + preparation + auxiliary
  const final = major ? Math.max(.05, Math.min(.95, total)) : Math.max(.9, Math.min(.99, total))
  return { isMajor: major, base, spiritRoot, comprehension, luck, talent, technique, path, state, environment, preparation, auxiliary, final, aid }
}

export function canBreakthrough(player: Player) {
  return checkBreakthroughRequirements(player).ready
}
