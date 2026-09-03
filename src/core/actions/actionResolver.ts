import { CharacterState, CultivationAction, type ActionResultType, type CultivationLog, type CultivationResources, type Player, type StatKey, type WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'
import { calculateCultivationGain } from '../cultivation/cultivation'
import { addPathExperience, applyPathTraining } from '../paths/paths'
import { growElement } from '../aptitude/aptitude'
import { practiceTechnique } from '../techniques/techniques'
import { techniqueById } from '../../data/techniques'
import { actionById, BODY_REALM_NAMES } from './action'
import { addCharacterState, recoverCharacter, removeCharacterState, updateBodyRealm } from './actionEffects'

export interface ActionResolution {
  action: CultivationAction
  years: number
  title: string
  summary: string
  resultType: ActionResultType
  cultivationGain: number
  techniqueExperience: number
  statChanges: Partial<Record<StatKey, number>>
  resourceGains: Partial<CultivationResources>
  spiritStoneGain: number
  lifeEventChance: number
  fateTag?: { id: string; name: string; description: string }
}

export interface ActionResolveOptions { forcedResult?: ActionResultType }

const clampYears = (action: CultivationAction, years?: number) => {
  const definition = actionById(action)
  return definition.durationOptions.includes(years ?? definition.defaultDuration) ? years ?? definition.defaultDuration : definition.defaultDuration
}

function addResources(player: Player, gains: Partial<CultivationResources>) {
  for (const key of Object.keys(gains) as (keyof CultivationResources)[]) player.resources[key] = Math.max(0, player.resources[key] + (gains[key] ?? 0))
}

function meditate(player: Player, world: WorldState, years: number, rng: RandomService, forced?: ActionResultType): ActionResolution {
  removeCharacterState(player, CharacterState.ENLIGHTENED)
  const months = years * 12
  const insightChance = Math.min(.42, .06 + player.stats.comprehension / 500 + player.stats.luck / 900)
  const innerDemonChance = Math.min(.55, .025 + (player.primaryPath === 'demonic' ? .12 : 0) + player.pathResources.innerDemon / 500)
  let resultType: ActionResultType = forced ?? (rng.chance(innerDemonChance) ? 'inner-demon' : rng.chance(insightChance) ? 'insight' : 'ordinary')
  let cultivationGain = calculateCultivationGain(player, months, world)
  if (resultType === 'inner-demon') { cultivationGain = Math.round(cultivationGain * .58); addCharacterState(player, CharacterState.INNER_DEMON); player.pathResources.innerDemon = Math.min(100, player.pathResources.innerDemon + 8 + years * 2) }
  if (resultType === 'insight') { cultivationGain = Math.round(cultivationGain * 1.3); addCharacterState(player, CharacterState.ENLIGHTENED); player.breakthroughProgress = Math.min(100, player.breakthroughProgress + 18 + years * 4) }
  player.cultivation += cultivationGain
  const active = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  const beforeLevel = active ? player.techniqueProgress.find((entry) => entry.techniqueId === active.id)?.level ?? 1 : 0
  const techniqueResult = active ? practiceTechnique(player, active, months * (resultType === 'insight' ? 1.5 : 1), world) : undefined
  const techniqueExperience = techniqueResult?.gained ?? 0
  if (techniqueResult && techniqueResult.progress.level > beforeLevel && resultType === 'ordinary') resultType = 'technique-breakthrough'
  const pathResult = applyPathTraining(player, months, world)
  if (player.cultivation >= player.cultivationRequired) {
    player.breakthroughProgress = Math.min(100, player.breakthroughProgress + Math.round(years * 18 + player.stats.comprehension / 12))
    addCharacterState(player, CharacterState.BOTTLENECK)
    if (resultType === 'ordinary') resultType = 'bottleneck'
  }
  const title = resultType === 'inner-demon' ? '闭关生魔' : resultType === 'insight' ? '闭关顿悟' : resultType === 'technique-breakthrough' ? '功法突破' : resultType === 'bottleneck' ? '触及瓶颈' : '静室修行'
  const summary = `${years}年闭关，修为增长 ${cultivationGain.toLocaleString()}${techniqueExperience ? `，功法经验 +${techniqueExperience}` : ''}${pathResult.resourceText ? `，${pathResult.resourceText}` : ''}${player.cultivation >= player.cultivationRequired ? '，已触及境界瓶颈' : '。'}`
  return { action: CultivationAction.MEDITATION, years, title, summary, resultType, cultivationGain, techniqueExperience, statChanges: pathResult.statGrowth ?? {}, resourceGains: {}, spiritStoneGain: 0, lifeEventChance: .12 }
}

function adventure(player: Player, world: WorldState, years: number, rng: RandomService, forced?: ActionResultType): ActionResolution {
  removeCharacterState(player, CharacterState.ENLIGHTENED)
  const path = player.primaryPath
  const resourceScale = world.continent.cultivationEnvironment.resourceMultiplier * (1 + player.realmIndex * .05) * years
  const dangerChance = Math.min(.7, .15 * world.continent.cultivationEnvironment.dangerMultiplier - player.stats.luck / 900)
  const resultType: ActionResultType = forced ?? (rng.chance(dangerChance) ? 'danger' : 'resource')
  const gains: Partial<CultivationResources> = {
    spiritHerbs: Math.max(0, Math.round(resourceScale * rng.randomInt(1, 3))),
    beastCores: Math.max(0, Math.round(resourceScale * rng.randomInt(0, 2))),
  }
  if (path === 'body') gains.bodyMaterials = Math.max(1, Math.round(resourceScale * 2.2))
  if (path === 'ghost') gains.soulCrystals = Math.max(1, Math.round(resourceScale * 1.8))
  if (path === 'sword') player.pathResources.swordIntent += Math.max(2, Math.round(years * (2 + player.stats.comprehension / 40)))
  if (path === 'demonic') { gains.beastCores = (gains.beastCores ?? 0) + Math.max(1, years * 2); player.pathResources.demonicNature = Math.min(100, player.pathResources.demonicNature + years * 3) }
  if (resultType === 'danger') {
    addCharacterState(player, rng.chance(.22) ? CharacterState.SERIOUS_INJURY : CharacterState.INJURED)
    player.dangerousEventCount++
  }
  addResources(player, gains)
  const spiritStoneGain = Math.round(resourceScale * rng.randomInt(8, 18))
  player.spiritStones += spiritStoneGain
  const cultivationGain = Math.round(calculateCultivationGain(player, years * 3, world) * .28)
  player.cultivation += cultivationGain
  if (path) addPathExperience(player, path, years * 18)
  return { action: CultivationAction.ADVENTURE, years, title: resultType === 'danger' ? '险地负伤' : '历练有成', summary: `${years}年历练，获得灵药 ${gains.spiritHerbs ?? 0}、妖丹 ${gains.beastCores ?? 0}、灵石 ${spiritStoneGain}${resultType === 'danger' ? '，归来时身负伤势。' : '。'}`, resultType, cultivationGain, techniqueExperience: 0, statChanges: {}, resourceGains: gains, spiritStoneGain, lifeEventChance: .55 }
}

function enlightenment(player: Player, world: WorldState, years: number): ActionResolution {
  removeCharacterState(player, CharacterState.INNER_DEMON)
  addCharacterState(player, CharacterState.ENLIGHTENED)
  const active = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  const techniqueResult = active ? practiceTechnique(player, active, years * 18, world) : undefined
  const elements = active?.elements.map((entry) => entry.element) ?? player.spiritualAptitude.innateRoot.elements
  for (const element of elements) growElement(player.spiritualAptitude, element, Math.max(2, Math.round(years * (3 + player.stats.comprehension / 35))))
  const path = player.primaryPath
  if (path) addPathExperience(player, path, years * (18 + player.stats.comprehension / 10))
  if (path === 'sword') player.pathResources.swordIntent += Math.round(years * (5 + player.stats.comprehension / 20))
  if (path === 'demonic') player.pathResources.demonicNature = Math.min(100, player.pathResources.demonicNature + years * 5)
  player.breakthroughProgress = Math.min(100, player.breakthroughProgress + Math.round(years * (20 + player.stats.comprehension / 10)))
  const five = player.spiritualAptitude.innateRoot.elements.length === 5
  const focus = five ? '五行流转渐趋圆融' : path === 'sword' ? '剑意随心而生' : path === 'demonic' ? '魔念化作道悟' : '道心愈发澄明'
  return { action: CultivationAction.ENLIGHTENMENT, years, title: '坐忘悟道', summary: `${years}年参悟，${focus}，突破准备提升至 ${player.breakthroughProgress}%。`, resultType: techniqueResult && techniqueResult.progress.level > 1 ? 'technique-breakthrough' : 'insight', cultivationGain: 0, techniqueExperience: techniqueResult?.gained ?? 0, statChanges: { comprehension: Math.max(1, Math.floor(years / 2)) }, resourceGains: {}, spiritStoneGain: 0, lifeEventChance: .28, fateTag: five ? { id: 'FIVE_ELEMENT_INSIGHT', name: '五行感悟', description: '悟道时体察五行轮转。' } : undefined }
}

function bodyTraining(player: Player, world: WorldState, years: number, rng: RandomService, forced?: ActionResultType): ActionResolution {
  removeCharacterState(player, CharacterState.ENLIGHTENED)
  const material = player.resources.bodyMaterials > 0 ? Math.min(player.resources.bodyMaterials, years) : 0
  player.resources.bodyMaterials -= material
  const before = player.bodyRealm
  const gain = Math.round(years * (18 + player.stats.constitution / 8 + material * 12) * (player.primaryPath === 'body' ? 1.35 : .85) * world.continent.cultivationEnvironment.spiritualQiMultiplier)
  player.bodyTrainingProgress += gain
  const after = updateBodyRealm(player)
  player.pathResources.maxQiBlood += Math.max(3, Math.round(gain / 8))
  player.pathResources.qiBlood = player.pathResources.maxQiBlood
  addPathExperience(player, 'body', years * 14, player.primaryPath !== 'body')
  const danger = forced === 'danger' || (!forced && rng.chance(Math.max(.03, .14 - player.stats.constitution / 900)))
  if (danger) addCharacterState(player, CharacterState.INJURED)
  const advanced = before !== after
  return { action: CultivationAction.BODY_TRAINING, years, title: advanced ? `肉身突破 · ${BODY_REALM_NAMES[after]}` : danger ? '淬体受创' : '锻体淬骨', summary: `${years}年炼体，肉身进度 +${gain}，气血上限提升${advanced ? `，踏入${BODY_REALM_NAMES[after]}` : ''}${danger ? '，同时留下伤势' : ''}。`, resultType: danger ? 'danger' : material ? 'resource' : 'ordinary', cultivationGain: 0, techniqueExperience: 0, statChanges: { constitution: Math.max(1, years) }, resourceGains: { bodyMaterials: -material }, spiritStoneGain: 0, lifeEventChance: .2 }
}

function travel(player: Player, world: WorldState, years: number, rng: RandomService): ActionResolution {
  removeCharacterState(player, CharacterState.ENLIGHTENED)
  const spiritStoneGain = Math.round(years * rng.randomInt(5, 18) * world.continent.cultivationEnvironment.resourceMultiplier)
  player.spiritStones += spiritStoneGain
  const encounter = rng.randomInt(1, 4)
  const names = ['同行修士', '云游商人', '山中隐士', '秘境传闻']
  return { action: CultivationAction.TRAVEL, years, title: '游历天下', summary: `${years}年行遍山河，遇见${names[encounter - 1]}，获得灵石 ${spiritStoneGain}，也留下新的因果线索。`, resultType: encounter === 3 ? 'insight' : 'resource', cultivationGain: 0, techniqueExperience: 0, statChanges: {}, resourceGains: {}, spiritStoneGain, lifeEventChance: .82, fateTag: { id: `TRAVEL_${world.currentYear}_${encounter}`, name: names[encounter - 1], description: '游历途中结下的一段缘法。' } }
}

function recovery(player: Player, years: number): ActionResolution {
  recoverCharacter(player, years)
  return { action: CultivationAction.RECOVERY, years, title: '静养调息', summary: `${years}年休养，伤势与心境得到调理，气血恢复充盈。`, resultType: 'recovery', cultivationGain: 0, techniqueExperience: 0, statChanges: { constitution: years >= 2 ? 1 : 0, soul: years >= 2 ? 1 : 0 }, resourceGains: {}, spiritStoneGain: 0, lifeEventChance: .06 }
}

export function resolveCultivationAction(player: Player, world: WorldState, action: CultivationAction, rng: RandomService, years?: number, options: ActionResolveOptions = {}): ActionResolution {
  const duration = clampYears(action, years)
  if (action === CultivationAction.MEDITATION) return meditate(player, world, duration, rng, options.forcedResult)
  if (action === CultivationAction.ADVENTURE) return adventure(player, world, duration, rng, options.forcedResult)
  if (action === CultivationAction.ENLIGHTENMENT) return enlightenment(player, world, duration)
  if (action === CultivationAction.BODY_TRAINING) return bodyTraining(player, world, duration, rng, options.forcedResult)
  if (action === CultivationAction.TRAVEL) return travel(player, world, duration, rng)
  return recovery(player, duration)
}

export function createCultivationLog(result: ActionResolution, year: number, month: number): CultivationLog {
  return { id: `${year}-${month}-${result.action}-${Math.random().toString(36).slice(2, 7)}`, year, month, action: result.action, years: result.years, title: result.title, summary: result.summary, cultivationGain: result.cultivationGain, techniqueExperience: result.techniqueExperience, resultType: result.resultType }
}

export const advanceYear = resolveCultivationAction
