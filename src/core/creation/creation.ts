import { ORIGINS, originById } from '../../data/origins'
import { SPIRIT_ROOT_ARCHETYPES, SPIRIT_ROOT_CONFIG } from '../../data/spiritRoots'
import { instantiateTalent, TALENTS, talentById } from '../../data/talents'
import type { CharacterBuild, Descendant, EntryType, OriginDefinition, OriginSecret, Player, PlayerStats, ReincarnationState, SpiritRoot, StatKey, TalentDefinition, TalentQuality } from '../../models'
import type { RandomService } from '../random/RandomService'
import { REALMS } from '../../data/realms'

export const STAT_KEYS: StatKey[] = ['comprehension', 'luck', 'constitution', 'soul', 'charm']
export const STAT_LABELS: Record<StatKey, string> = { comprehension: '悟性', luck: '气运', constitution: '体魄', soul: '神识', charm: '魅力' }
export const TALENT_QUALITY_ORDER: TalentQuality[] = ['普通', '优秀', '稀有', '极品', '传说']
const secrets: OriginSecret[] = ['普通弃婴', '修士遗孤', '魔修血脉', '妖族血脉', '大能转世', '古族后裔']

export function allocateStat(stats: PlayerStats, key: StatKey, delta: number, origin: OriginDefinition, capBonus: number, remaining: number) {
  const floor = origin.baseStats[key]
  const cap = origin.statCaps[key] + capBonus
  if (delta > 0 && (remaining < delta || stats[key] + delta > cap)) return { stats, remaining }
  if (delta < 0 && stats[key] + delta < floor) return { stats, remaining }
  return { stats: { ...stats, [key]: stats[key] + delta }, remaining: remaining - delta }
}

export function randomizeStats(origin: OriginDefinition, capBonus: number, rng: RandomService): PlayerStats {
  const result = { ...origin.baseStats }
  let remaining = origin.freeStatPoints
  while (remaining > 0) {
    const available = STAT_KEYS.filter((key) => result[key] < origin.statCaps[key] + capBonus)
    if (!available.length) break
    result[rng.pick(available)]++
    remaining--
  }
  return result
}

export function randomSpiritRoot(rng: RandomService, rootLuck = 0, maxRank = 7): SpiritRoot {
  const eligible = SPIRIT_ROOT_ARCHETYPES.filter((root) => root.rank <= maxRank)
  const chosen = rng.weightedRandom(eligible.map(({ weight, ...root }) => ({
    value: root,
    weight: weight * (1 + Math.max(0, root.rank - 3) * rootLuck / 45) * (root.rank >= 6 ? SPIRIT_ROOT_CONFIG.variantWeightBonus : 1),
  })))
  return structuredClone(chosen)
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

export function validateBuild(build: CharacterBuild, origin: OriginDefinition, capBonus: number, talentPool: TalentDefinition[]) {
  const spentStats = STAT_KEYS.reduce((sum, key) => sum + build.stats[key] - origin.baseStats[key], 0)
  if (spentStats !== origin.freeStatPoints) return '请分配完全部属性点。'
  if (STAT_KEYS.some((key) => build.stats[key] < origin.baseStats[key] || build.stats[key] > origin.statCaps[key] + capBonus)) return '属性超出了当前出身的合法范围。'
  const picked = build.talentIds.map(talentById).filter((talent): talent is TalentDefinition => Boolean(talent))
  if (picked.some((talent) => !talentPool.some((entry) => entry.id === talent.id))) return '所选天赋尚未解锁。'
  if (picked.reduce((sum, talent) => sum + talent.cost, 0) > build.talentBudget) return '天赋点不足。'
  if (!build.spiritRoot || build.spiritRoot.rank < 1) return '请选择灵根。'
  const expectedElements = build.spiritRoot.rank <= 5 ? 6 - build.spiritRoot.rank : build.spiritRoot.elements.length
  if (!build.randomRoot && build.spiritRoot.elements.length !== expectedElements) return '请选择完整的灵根元素组合。'
  return ''
}

function talentStatEffects(stats: PlayerStats, talents: TalentDefinition[]) {
  for (const talent of talents) for (const effect of talent.effects) if (effect.type === 'stat' && effect.stat) stats[effect.stat] += effect.value
}

export function createPlayerFromBuild(build: CharacterBuild, generation: number, worldYear: number, entryType: EntryType, familyId: string, familyName: string, rng: RandomService, predecessorName?: string): Player {
  const origin = originById(build.originId)
  const talents = build.talentIds.map(talentById).filter((talent): talent is TalentDefinition => Boolean(talent))
  const finalStats = { ...build.stats }
  talentStatEffects(finalStats, talents)
  if (build.randomRoot) finalStats.luck += SPIRIT_ROOT_CONFIG.randomLuckBonus
  const lifespanMultiplier = 1 + talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'lifespanMultiplier').reduce((sum, effect) => sum + effect.value, 0)
  const realm = REALMS[origin.startingRealmIndex]
  return {
    id: crypto.randomUUID(), name: build.name.trim() || rng.pick(['沈砚', '林昭', '顾长风', '苏问雪', '江照夜', '叶知秋']), generation,
    birthYear: worldYear - 16, ageMonths: 192, lifespanMonths: Math.round((realm.baseLifespanYears * 12 + Math.max(0, finalStats.constitution - 50) * 2) * lifespanMultiplier),
    realmIndex: origin.startingRealmIndex, cultivation: origin.startingCultivation, cultivationRequired: realm.cultivationRequired,
    spiritRoot: structuredClone(build.spiritRoot), stats: finalStats, spiritStones: origin.startingSpiritStones, inventory: [],
    talents: talents.map((talent) => instantiateTalent(talent, generation)), talentPoints: build.talentBudget, origin, originSecret: origin.id === 'mystery' ? rng.pick(secrets) : undefined,
    familyId, bloodline: { familyId, familyName, bloodlineLevel: entryType === 'initial' ? 1 : 0, inheritedTraits: origin.tags.filter((tag) => tag.includes('血脉')) },
    entryType, predecessorName, alive: true, achievements: [], timeline: [],
  }
}

export function selectableOrigins(firstGeneration: boolean, reincarnation: ReincarnationState) {
  return ORIGINS.filter((origin) => firstGeneration ? origin.firstGenerationAvailable : origin.firstGenerationAvailable || reincarnation.selections.advancedOriginAccess || reincarnation.unlockedOrigins.includes(origin.id))
}

export function generateDescendant(parent: Player, worldYear: number, rng: RandomService): Descendant {
  const fluctuation = () => rng.randomInt(-13, 13)
  const inheritedStats = Object.fromEntries(STAT_KEYS.map((key) => [key, Math.max(30, Math.round(parent.stats[key] * .68 + 18 + fluctuation()))])) as PlayerStats
  const inheritedRankBoost = Math.max(0, Math.floor((parent.spiritRoot.rank - 3) / 2))
  const spiritRoot = randomSpiritRoot(rng, inheritedRankBoost * 5, Math.min(7, 5 + inheritedRankBoost))
  const inheritedTalents = parent.talents.filter(() => rng.chance(.18)).slice(0, 2).map((talent) => ({ ...talent, acquiredGeneration: parent.generation + 1 }))
  const surname = parent.name.slice(0, 1)
  const name = `${surname}${rng.pick(['清河', '念安', '望舒', '知微', '云岫', '景行', '明夷', '若木'])}`
  const ageYears = rng.randomInt(0, Math.max(0, Math.min(28, Math.floor(parent.ageMonths / 12) - 18)))
  return {
    id: crypto.randomUUID(), name, parents: [parent.id], generation: parent.generation + 1, birthYear: worldYear - ageYears,
    ageMonths: ageYears * 12, lifespanMonths: REALMS[0].baseLifespanYears * 12 + Math.max(0, inheritedStats.constitution - 50) * 2,
    realmIndex: ageYears >= 18 && rng.chance(.45) ? Math.min(3, parent.realmIndex) : 0, cultivation: 0, spiritRoot, stats: inheritedStats,
    talents: inheritedTalents, origin: parent.origin, bloodlineTags: [...new Set([...parent.bloodline.inheritedTraits, ...parent.origin.tags.filter((tag) => tag.includes('血脉'))])],
    familyId: parent.familyId, alive: true, inventory: [], spiritStones: Math.round(parent.spiritStones * .08),
  }
}
