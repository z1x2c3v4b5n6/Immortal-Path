import { ORIGINS, originById } from '../../data/origins'
import { createSpiritRoot, MUTATED_ELEMENTS, ROOT_COUNT_RULES, ROOT_QUALITY_RULES, SPIRIT_ROOT_CONFIG, spiritRootPotentialModifiers, STANDARD_ELEMENTS } from '../../data/spiritRoots'
import { instantiateTalent, TALENTS, talentById } from '../../data/talents'
import { BodyRealm, CharacterState, type CharacterBuild, type Descendant, type EntryType, type OriginDefinition, type OriginSecret, type Player, type PlayerStats, type ReincarnationState, type SpiritElement, type SpiritRoot, type SpiritRootQuality, type StatKey, type TalentDefinition, type TalentQuality } from '../../models'
import type { RandomService } from '../random/RandomService'
import { REALMS } from '../../data/realms'
import { initialPathResources } from '../paths/paths'
import { calculateMaxLifespanMonths } from '../lifespan/lifespan'
import { createSpiritualAptitude } from '../aptitude/aptitude'
import { initialCultivationResources } from '../actions/actionEffects'

export const STAT_KEYS: StatKey[] = ['comprehension', 'luck', 'constitution', 'soul', 'charm']
export const STAT_LABELS: Record<StatKey, string> = { comprehension: '悟性', luck: '气运', constitution: '体魄', soul: '神识', charm: '魅力' }
export const TALENT_QUALITY_ORDER: TalentQuality[] = ['普通', '优秀', '稀有', '极品', '传说']
const secrets: OriginSecret[] = ['普通弃婴', '修士遗孤', '魔修血脉', '妖族血脉', '大能转世', '古族后裔']

export interface ManualRootPolicy { counts: number[]; elements: SpiritElement[]; qualities: SpiritRootQuality[] }
export function manualRootPolicy(firstGeneration: boolean, reincarnation: ReincarnationState): ManualRootPolicy {
  const qualityOrder: SpiritRootQuality[] = ['NORMAL', 'PURE', 'HEAVENLY']
  const maxQualityIndex = qualityOrder.indexOf(reincarnation.selections.maxRootQuality)
  return {
    counts: reincarnation.selections.canChooseSingleRoot && !firstGeneration ? [5, 4, 3, 2, 1] : [5, 4, 3, 2],
    elements: !firstGeneration && reincarnation.selections.canChooseMutatedElements ? [...STANDARD_ELEMENTS, ...MUTATED_ELEMENTS] : [...STANDARD_ELEMENTS],
    qualities: firstGeneration ? ['NORMAL'] : qualityOrder.slice(0, maxQualityIndex + 1),
  }
}

export function isManualSpiritRootAllowed(root: SpiritRoot, policy: ManualRootPolicy): boolean {
  return policy.counts.includes(root.elements.length) && root.elements.every((element) => policy.elements.includes(element)) && policy.qualities.includes(root.quality)
}

export function allocateStat(stats: PlayerStats, key: StatKey, delta: number, origin: OriginDefinition, capBonus: number, remaining: number) {
  const floor = origin.baseStats[key]
  const cap = origin.statCaps[key] + capBonus
  if (delta > 0 && (remaining < delta || stats[key] + delta > cap)) return { stats, remaining }
  if (delta < 0 && stats[key] + delta < floor) return { stats, remaining }
  return { stats: { ...stats, [key]: stats[key] + delta }, remaining: remaining - delta }
}

export const totalFreeStatPoints = (origin: OriginDefinition, spiritRoot: SpiritRoot) => origin.freeStatPoints + spiritRoot.statPointBonus

export function randomizeStats(origin: OriginDefinition, capBonus: number, rng: RandomService, bonusPoints = 0): PlayerStats {
  const result = { ...origin.baseStats }
  let remaining = origin.freeStatPoints + bonusPoints
  while (remaining > 0) {
    const available = STAT_KEYS.filter((key) => result[key] < origin.statCaps[key] + capBonus)
    if (!available.length) break
    result[rng.pick(available)]++
    remaining--
  }
  return result
}

export interface RandomSpiritRootOptions { allowMutation?: boolean; allowHeavenly?: boolean; heavenlyWeightMultiplier?: number }

export function randomSpiritRoot(rng: RandomService, rootLuck = 0, options: RandomSpiritRootOptions = {}): SpiritRoot {
  // 第一阶段：决定广度。数量不代表稀有度，也不受“越少越好”的旧阶梯影响。
  const count = rng.weightedRandom(ROOT_COUNT_RULES.map((rule) => ({ value: rule.count, weight: rule.randomWeight })))
  // 第二阶段：从五行中无放回抽取元素。
  const pool = [...STANDARD_ELEMENTS]
  const elements: SpiritElement[] = []
  while (elements.length < count) elements.push(pool.splice(rng.randomInt(0, pool.length - 1), 1)[0])
  // 第三阶段：独立判定异变与品质；随机模式始终保留抽到稀有结果的可能。
  const mutationChance = options.allowMutation === false ? 0 : SPIRIT_ROOT_CONFIG.mutationChance * (1 + Math.max(0, rootLuck) / 80)
  if (rng.chance(mutationChance)) elements[rng.randomInt(0, elements.length - 1)] = rng.pick(MUTATED_ELEMENTS)
  const qualities: SpiritRootQuality[] = options.allowHeavenly === false ? ['NORMAL', 'PURE'] : ['NORMAL', 'PURE', 'HEAVENLY']
  const quality = rng.weightedRandom(qualities.map((value) => ({
    value,
    weight: ROOT_QUALITY_RULES[value].randomWeight * (value === 'NORMAL' ? 1 : 1 + Math.max(0, rootLuck) * SPIRIT_ROOT_CONFIG.qualityLuckScale) * (value === 'HEAVENLY' ? options.heavenlyWeightMultiplier ?? 1 : 1),
  })))
  return createSpiritRoot(elements, quality)
}

export function isTalentUnlocked(talent: TalentDefinition, reincarnation: ReincarnationState, completedLives: number) {
  if (talent.firstGenerationAvailable) return true
  if (reincarnation.unlockedTalents.includes(talent.id)) return true
  const requirement = talent.unlockRequirement
  if (!requirement) return true
  if (requirement.type === 'generation') return completedLives + 1 >= Number(requirement.value)
  if (requirement.type === 'rareEvents') return reincarnation.rareEventCount >= Number(requirement.value)
  return false
}

export function availableTalents(reincarnation: ReincarnationState, completedLives: number, firstGeneration: boolean) {
  const maxQuality = firstGeneration ? '优秀' : reincarnation.selections.maxTalentQuality
  const maxIndex = TALENT_QUALITY_ORDER.indexOf(maxQuality)
  return TALENTS.filter((talent) => TALENT_QUALITY_ORDER.indexOf(talent.quality) <= maxIndex && isTalentUnlocked(talent, reincarnation, completedLives))
}

export function randomTalentIds(budget: number, pool: TalentDefinition[], rng: RandomService): string[] {
  const result: string[] = []
  let remaining = budget
  let candidates = pool.filter((talent) => talent.cost <= remaining)
  while (candidates.length) {
    const chosen = rng.weightedRandom(candidates.map((talent) => ({ value: talent, weight: Math.max(1, 7 - talent.cost) })))
    result.push(chosen.id)
    remaining -= chosen.cost
    candidates = pool.filter((talent) => !result.includes(talent.id) && talent.cost <= remaining)
  }
  return result
}

export function validateBuild(build: CharacterBuild, origin: OriginDefinition, capBonus: number, talentPool: TalentDefinition[], rootPolicy?: ManualRootPolicy) {
  const spentStats = STAT_KEYS.reduce((sum, key) => sum + build.stats[key] - origin.baseStats[key], 0)
  if (spentStats !== totalFreeStatPoints(origin, build.spiritRoot)) return '请分配完全部属性点。'
  if (STAT_KEYS.some((key) => build.stats[key] < origin.baseStats[key] || build.stats[key] > origin.statCaps[key] + capBonus)) return '属性超出了当前出身的合法范围。'
  const picked = build.talentIds.map(talentById).filter((talent): talent is TalentDefinition => Boolean(talent))
  if (picked.some((talent) => !talentPool.some((entry) => entry.id === talent.id))) return '所选天赋尚未解锁。'
  if (picked.reduce((sum, talent) => sum + talent.cost, 0) > build.talentBudget) return '天赋点不足。'
  if (!build.spiritRoot || build.spiritRoot.elements.length < 1 || build.spiritRoot.elements.length > 5) return '请选择灵根。'
  if (new Set(build.spiritRoot.elements).size !== build.spiritRoot.elements.length) return '灵根元素不可重复。'
  if (!build.randomRoot && rootPolicy && !isManualSpiritRootAllowed(build.spiritRoot, rootPolicy)) return '当前轮回权限无法手动选择此灵根。'
  return ''
}

function talentStatEffects(stats: PlayerStats, talents: TalentDefinition[]) {
  for (const talent of talents) for (const effect of talent.effects) if (effect.type === 'stat' && effect.stat) stats[effect.stat] += effect.value
}

export function createStatPotential(origin: OriginDefinition, capBonus: number, rng: RandomService, current?: PlayerStats, spiritRoot?: SpiritRoot): PlayerStats {
  const rootModifiers = spiritRoot ? spiritRootPotentialModifiers(spiritRoot) : {}
  return Object.fromEntries(STAT_KEYS.map((key) => {
    const variation = origin.id === 'mystery' && key !== 'soul' ? rng.randomInt(-6, 8) : 0
    return [key, Math.max(current?.[key] ?? 1, origin.statCaps[key] + capBonus + variation + (rootModifiers[key] ?? 0))]
  })) as PlayerStats
}

export function createPlayerFromBuild(build: CharacterBuild, generation: number, worldYear: number, entryType: EntryType, familyId: string, familyName: string, rng: RandomService, potentialBonus = 0, predecessorName?: string): Player {
  const origin = originById(build.originId)
  const talents = build.talentIds.map(talentById).filter((talent): talent is TalentDefinition => Boolean(talent))
  const finalStats = { ...build.stats }
  talentStatEffects(finalStats, talents)
  if (build.randomRoot) finalStats.luck += SPIRIT_ROOT_CONFIG.randomLuckBonus
  const realm = REALMS[origin.startingRealmIndex]
  const player: Player = {
    id: crypto.randomUUID(), name: build.name.trim() || rng.pick(['沈砚', '林昭', '顾长风', '苏问雪', '江照夜', '叶知秋']), generation,
    birthYear: worldYear - 16, ageMonths: 192, lifespanMonths: 1,
    realmIndex: origin.startingRealmIndex, cultivation: origin.startingCultivation, cultivationRequired: realm.cultivationRequired,
    spiritRoot: structuredClone(build.spiritRoot), stats: finalStats, statPotential: createStatPotential(origin, potentialBonus, rng, finalStats, build.spiritRoot), statHistory: [], spiritStones: origin.startingSpiritStones, inventory: [],
    talents: talents.map((talent) => instantiateTalent(talent, generation)), talentPoints: build.talentBudget, origin, originSecret: origin.id === 'mystery' ? rng.pick(secrets) : undefined,
    familyId, bloodline: { familyId, familyName, bloodlineLevel: entryType === 'initial' ? 1 : 0, inheritedTraits: origin.tags.filter((tag) => tag.includes('血脉')) },
    entryType, predecessorName, alive: true, deathFinalized: false, achievements: [], timeline: [],
    secondaryPaths: [], pathProgress: [], pathResources: initialPathResources(), unlockedPaths: ['dao', 'sword', 'body'],
    lifespanFateModifier: rng.randomInt(-100, 100) / 1000, lifespanBonusMonths: 0,
    spiritualAptitude: createSpiritualAptitude(build.spiritRoot), acquiredTalents: [], knownTechniques: ['plain-breath'], techniqueProgress: [],
    nearDeathCount: 0, dangerousEventCount: 0, severeInjuryCount: 0, luckyOutcomeStreak: 0, rareEventCount: 0, lateMajorBreakthroughs: 0,
    lifeEventHistory: [], fateTags: [], fatePaths: [], lifeTimeline: [], importantEvents: [],
    cultivationLogs: [], resources: initialCultivationResources(), characterStates: [CharacterState.NORMAL], breakthroughHistory: [], breakthroughProgress: 0,
    bodyRealm: BodyRealm.SKIN, bodyTrainingProgress: 0,
    eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [], discipleIds: [], socialHistory: [],
  }
  player.lifespanMonths = calculateMaxLifespanMonths(player)
  return player
}

export function selectableOrigins(firstGeneration: boolean, reincarnation: ReincarnationState) {
  return ORIGINS.filter((origin) => firstGeneration ? origin.firstGenerationAvailable : origin.firstGenerationAvailable || reincarnation.selections.advancedOriginAccess || reincarnation.unlockedOrigins.includes(origin.id))
}

export function generateDescendant(parent: Player, worldYear: number, rng: RandomService): Descendant {
  const fluctuation = () => rng.randomInt(-13, 13)
  const inheritedStats = Object.fromEntries(STAT_KEYS.map((key) => [key, Math.max(30, Math.round(parent.stats[key] * .68 + 18 + fluctuation()))])) as PlayerStats
  const inheritedPotential = Object.fromEntries(STAT_KEYS.map((key) => [key, Math.max(inheritedStats[key], Math.round(parent.statPotential[key] * .72 + 15 + fluctuation()))])) as PlayerStats
  const inheritedRootLuck = (parent.spiritRoot.quality === 'HEAVENLY' ? 12 : parent.spiritRoot.quality === 'PURE' ? 6 : 0) + parent.spiritRoot.mutations.length * 4
  const spiritRoot = randomSpiritRoot(rng, inheritedRootLuck)
  const rootPotential = spiritRootPotentialModifiers(spiritRoot)
  for (const key of STAT_KEYS) inheritedPotential[key] = Math.max(inheritedStats[key], inheritedPotential[key] + (rootPotential[key] ?? 0))
  const inheritedTalents = parent.talents.filter(() => rng.chance(.18)).slice(0, 2).map((talent) => ({ ...talent, acquiredGeneration: parent.generation + 1 }))
  const surname = parent.name.slice(0, 1)
  const name = `${surname}${rng.pick(['清河', '念安', '望舒', '知微', '云岫', '景行', '明夷', '若木'])}`
  const ageYears = rng.randomInt(0, Math.max(0, Math.min(28, Math.floor(parent.ageMonths / 12) - 18)))
  return {
    id: crypto.randomUUID(), name, parents: [parent.id], generation: parent.generation + 1, birthYear: worldYear - ageYears,
    ageMonths: ageYears * 12, lifespanMonths: REALMS[0].baseLifespanYears * 12 + Math.max(0, inheritedStats.constitution - 50) * 2,
    realmIndex: ageYears >= 18 && rng.chance(.45) ? Math.min(3, parent.realmIndex) : 0, cultivation: 0, spiritRoot, stats: inheritedStats, statPotential: inheritedPotential,
    talents: inheritedTalents, origin: parent.origin, bloodlineTags: [...new Set([...parent.bloodline.inheritedTraits, ...parent.origin.tags.filter((tag) => tag.includes('血脉'))])],
    familyId: parent.familyId, alive: true, inventory: [], spiritStones: Math.round(parent.spiritStones * .08),
  }
}
