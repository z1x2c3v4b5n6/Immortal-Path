import { originById } from '../../data/origins'
import { CREATION_CONFIG } from '../../data/creationConfig'
import { createSpiritRoot, MUTATED_ELEMENTS, STANDARD_ELEMENTS } from '../../data/spiritRoots'
import { instantiateTalent, talentById } from '../../data/talents'
import { BodyRealm, CharacterState, CultivationAction, type AcquiredSpiritRoot, type CultivationPathId, type CultivationPathProgress, type Descendant, type EntryType, type FamilyState, type GameSave, type LifeRecord, type NPCCultivator, type Player, type PlayerStats, type ReincarnationState, type Sect, type SpiritElement, type SpiritRoot, type SpiritRootQuality, type TalentDefinition, type TalentInstance, type TechniqueProgress, type WorldState } from '../../models'
import { initialReincarnation } from '../reincarnation/reincarnation'
import { createWorld, generateContinent, stableLegacySeed } from '../world/world'
import { initialPathResources } from '../paths/paths'
import { calculateMaxLifespanMonths } from '../lifespan/lifespan'
import { ALL_SPIRIT_ELEMENTS, createSpiritualAptitude } from '../aptitude/aptitude'
import { initialCultivationResources } from '../actions/actionEffects'
import { BODY_REALM_ORDER } from '../actions/action'
import { initialSectRelations } from '../sect/sectRelation'
import { generateTerritories } from '../world/territories'
import { createSeededRandom } from '../random/RandomService'

export const CURRENT_SAVE_VERSION = 11
type UnknownRecord = Record<string, unknown>
const record = (value: unknown): UnknownRecord => value && typeof value === 'object' ? value as UnknownRecord : {}

function migrateRoot(value: unknown): SpiritRoot {
  const old = record(value)
  const allowed = [...STANDARD_ELEMENTS, ...MUTATED_ELEMENTS]
  const oldElements = Array.isArray(old.elements) ? old.elements.filter((entry): entry is SpiritElement => allowed.includes(entry as SpiritElement)) : []
  const oldRank = typeof old.rank === 'number' ? old.rank : undefined
  const countFromRank = oldRank && oldRank <= 5 ? 6 - oldRank : oldRank === 6 ? 2 : oldRank === 7 ? 5 : 5
  let elements = [...new Set(oldElements)].slice(0, 5)
  if (!elements.length || oldElements.includes('混元' as SpiritElement)) elements = [...STANDARD_ELEMENTS.slice(0, countFromRank)]
  if (oldRank === 6 && !elements.some((element) => MUTATED_ELEMENTS.includes(element))) elements = ['风', '雷']
  const quality: SpiritRootQuality = old.quality === 'PURE' || old.quality === 'HEAVENLY'
    ? old.quality
    : oldRank === 7 || String(old.name ?? '').includes('天灵根') ? 'HEAVENLY'
      : String(old.name ?? '').includes('纯') ? 'PURE' : 'NORMAL'
  return createSpiritRoot(elements, quality)
}

function migratePotential(value: unknown, stats: PlayerStats, originId: string): PlayerStats {
  const old = record(value)
  const caps = originById(originId).statCaps
  return {
    comprehension: typeof old.comprehension === 'number' ? old.comprehension : Math.max(stats.comprehension, caps.comprehension),
    luck: typeof old.luck === 'number' ? old.luck : Math.max(stats.luck, caps.luck),
    constitution: typeof old.constitution === 'number' ? old.constitution : Math.max(stats.constitution, caps.constitution),
    soul: typeof old.soul === 'number' ? old.soul : Math.max(stats.soul, caps.soul),
    charm: typeof old.charm === 'number' ? old.charm : Math.max(stats.charm, caps.charm),
  }
}

function migrateAptitude(value: unknown, innateRoot: SpiritRoot): Player['spiritualAptitude'] {
  const old = record(value)
  const next = createSpiritualAptitude(innateRoot)
  if (Array.isArray(old.acquiredRoots)) next.acquiredRoots = old.acquiredRoots.map((entry, index) => {
    const root = record(entry)
    const element = ALL_SPIRIT_ELEMENTS.includes(root.element as SpiritElement) ? root.element as SpiritElement : '木'
    return {
      id: typeof root.id === 'string' ? root.id : `legacy-root-${index}`, element,
      purity: Math.max(1, Math.min(100, typeof root.purity === 'number' ? root.purity : 50)),
      stability: Math.max(0, Math.min(100, typeof root.stability === 'number' ? root.stability : 50)),
      source: typeof root.source === 'string' ? root.source : '旧存档迁移',
      acquiredYear: typeof root.acquiredYear === 'number' ? root.acquiredYear : 0,
      acquiredMonth: typeof root.acquiredMonth === 'number' ? root.acquiredMonth : 1,
    } satisfies AcquiredSpiritRoot
  })
  const growth = record(old.elementalGrowth)
  const purity = record(old.elementalPurity)
  for (const element of ALL_SPIRIT_ELEMENTS) {
    if (typeof growth[element] === 'number') next.elementalGrowth[element] = Math.max(0, Number(growth[element]))
    if (typeof purity[element] === 'number') next.elementalPurity[element] = Math.max(0, Math.min(100, Number(purity[element])))
  }
  for (const root of next.acquiredRoots) next.elementalPurity[root.element] = Math.max(next.elementalPurity[root.element], root.purity)
  return next
}

function migrateDescendants(value: unknown): Descendant[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const old = record(entry)
    const originId = typeof record(old.origin).id === 'string' ? String(record(old.origin).id) : 'farmer'
    const stats = old.stats as PlayerStats
    return { ...(old as unknown as Descendant), origin: originById(originId), spiritRoot: migrateRoot(old.spiritRoot), stats, statPotential: migratePotential(old.statPotential, stats, originId) }
  })
}

function migrateTalents(value: unknown, generation: number): TalentInstance[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const old = record(entry)
    const id = typeof old.id === 'string' ? old.id : typeof old.definitionId === 'string' ? old.definitionId : ''
    const definition = talentById(id) ?? ({
      id: id || `legacy-${generation}`, name: typeof old.name === 'string' ? old.name : '旧世天赋', quality: '普通', cost: 1,
      description: typeof old.description === 'string' ? old.description : '由旧存档迁移的天赋。', firstGenerationAvailable: true,
      effects: [
        ...(typeof old.cultivationMultiplier === 'number' ? [{ type: 'cultivationMultiplier' as const, value: old.cultivationMultiplier - 1 }] : []),
        ...(typeof old.breakthroughBonus === 'number' ? [{ type: 'breakthroughBonus' as const, value: old.breakthroughBonus }] : []),
      ],
    } satisfies TalentDefinition)
    return instantiateTalent(definition, generation)
  })
}

function migrateCultivationLogs(value: unknown): Player['cultivationLogs'] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const old = record(entry)
    const resultType = typeof old.resultType === 'string' ? old.resultType : 'ordinary'
    const importance = typeof old.importance === 'number' && old.importance >= 1 && old.importance <= 4
      ? old.importance as 1 | 2 | 3 | 4
      : resultType === 'danger' || resultType === 'inner-demon' || resultType === 'technique-breakthrough' ? 3 : resultType === 'insight' || resultType === 'bottleneck' ? 2 : 1
    return { ...(old as unknown as Player['cultivationLogs'][number]), importance }
  })
}

function migrateSects(value: unknown, defaults: Sect[]): Sect[] {
  if (!Array.isArray(value) || !value.length) return defaults
  return value.map((entry, index) => {
    const old = record(entry); const fallback = defaults[index % defaults.length]
    return { ...fallback, ...(old as Partial<Sect>), id: typeof old.id === 'string' ? old.id : fallback.id, name: typeof old.name === 'string' ? old.name : fallback.name, power: typeof old.power === 'number' ? old.power : fallback.power, status: typeof old.status === 'string' ? old.status : fallback.status, techniqueIds: Array.isArray(old.techniqueIds) ? old.techniqueIds.filter((id): id is string => typeof id === 'string') : fallback.techniqueIds }
  })
}

function migrateFamilies(value: unknown): FamilyState[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const old = record(entry)
    return { ...(old as unknown as FamilyState), kind: old.kind === '修仙家族' || old.kind === '玩家家族' ? old.kind : '凡人家族', resources: typeof old.resources === 'number' ? old.resources : typeof old.wealth === 'number' ? Math.floor(old.wealth / 2) : 0, fame: typeof old.fame === 'number' ? old.fame : typeof old.reputation === 'number' ? old.reputation : 0, territory: typeof old.territory === 'string' ? old.territory : '故乡村镇', history: Array.isArray(old.history) ? old.history as FamilyState['history'] : [] }
  })
}

function migrateNPCCultivators(value: unknown): NPCCultivator[] {
  if (!Array.isArray(value)) return []
  return value.map((entry, index) => {
    const old = record(entry); const realmIndex = typeof old.realmIndex === 'number' ? old.realmIndex : 0
    return { ...(old as unknown as NPCCultivator), id: typeof old.id === 'string' ? old.id : `legacy-npc-${index}`, name: typeof old.name === 'string' ? old.name : `旧世修士${index + 1}`, ageMonths: typeof old.ageMonths === 'number' ? old.ageMonths : 20 * 12, lifespanMonths: typeof old.lifespanMonths === 'number' ? old.lifespanMonths : 100 * 12, realmIndex, cultivation: typeof old.cultivation === 'number' ? old.cultivation : 0, spiritRoot: migrateRoot(old.spiritRoot), path: ['dao', 'sword', 'body', 'demonic', 'ghost'].includes(String(old.path)) ? old.path as CultivationPathId : 'dao', talents: Array.isArray(old.talents) ? old.talents.filter((item): item is string => typeof item === 'string') : [], personality: typeof old.personality === 'string' ? old.personality : '沉稳', alive: old.alive !== false, generation: typeof old.generation === 'number' ? old.generation : 1 }
  })
}

function migrateReincarnation(value: unknown): ReincarnationState {
  const old = record(value)
  const next = initialReincarnation()
  next.totalPoints = typeof old.totalPoints === 'number' ? old.totalPoints : 0
  if (Array.isArray(old.unlockedTalents)) next.unlockedTalents = old.unlockedTalents.filter((entry): entry is string => typeof entry === 'string')
  if (Array.isArray(old.unlockedOrigins)) next.unlockedOrigins = old.unlockedOrigins.filter((entry): entry is string => typeof entry === 'string')
  if (typeof old.rareLootCount === 'number') next.rareLootCount = old.rareLootCount
  if (typeof old.rareEventCount === 'number') {
    // V3 及更早版本只在稀有掉落时增加此字段，因此迁移到正确的掉落计数。
    next.rareLootCount = Math.max(next.rareLootCount, old.rareEventCount)
    if (typeof old.rareLootCount === 'number') next.rareEventCount = old.rareEventCount
  }
  const oldSelections = record(old.selections)
  if (Object.keys(oldSelections).length) {
    if (typeof oldSelections.extraTalentPoints === 'number') next.selections.extraTalentPoints = oldSelections.extraTalentPoints
    if (typeof oldSelections.statCapBonus === 'number') next.selections.statCapBonus = oldSelections.statCapBonus
    if (['普通', '优秀', '稀有', '极品', '传说'].includes(String(oldSelections.maxTalentQuality))) next.selections.maxTalentQuality = oldSelections.maxTalentQuality as ReincarnationState['selections']['maxTalentQuality']
    next.selections.advancedOriginAccess = oldSelections.advancedOriginAccess === true
    next.selections.carryMemory = oldSelections.carryMemory === true
    const legacyPermissionKey = ['max', 'Root', 'Rank'].join('')
    const legacyPermission = oldSelections[legacyPermissionKey]
    const legacyRank = typeof legacyPermission === 'number' ? legacyPermission : 4
    next.selections.canChooseSingleRoot = oldSelections.canChooseSingleRoot === true || legacyRank >= 5
    next.selections.canChooseMutatedElements = oldSelections.canChooseMutatedElements === true || legacyRank >= 6
    next.selections.maxRootQuality = oldSelections.maxRootQuality === 'HEAVENLY' || legacyRank >= 7 ? 'HEAVENLY' : oldSelections.maxRootQuality === 'PURE' ? 'PURE' : 'NORMAL'
  }
  next.inHall = old.inHall === true
  const upgrades = record(old.upgrades)
  const legacyLevels = Object.values(upgrades).reduce<number>((sum, level) => sum + (typeof level === 'number' ? level : 0), 0)
  next.totalPoints += legacyLevels * 30
  return next
}

function migratePlayer(value: unknown, world: WorldState, sourceVersion: number): Player | null {
  if (!value || typeof value !== 'object') return null
  const old = record(value)
  const generation = typeof old.generation === 'number' ? old.generation : 1
  const oldOrigin = record(old.origin)
  const origin = originById(typeof oldOrigin.id === 'string' ? oldOrigin.id : 'farmer')
  const id = typeof old.id === 'string' ? old.id : crypto.randomUUID()
  const familyId = typeof old.familyId === 'string' ? old.familyId : `family-${id}`
  const realmIndex = typeof old.realmIndex === 'number' ? old.realmIndex : 0
  const entryType: EntryType = old.entryType === 'bloodline' || old.entryType === 'reincarnation' ? old.entryType : 'initial'
  const stats = old.stats as PlayerStats
  const validPaths: CultivationPathId[] = ['dao', 'sword', 'body', 'demonic', 'ghost']
  const primaryPath = validPaths.includes(old.primaryPath as CultivationPathId) ? old.primaryPath as CultivationPathId : undefined
  const pathProgressValue = Array.isArray(old.pathProgress) ? old.pathProgress.filter((entry): entry is CultivationPathProgress => validPaths.includes(record(entry).pathId as CultivationPathId)) : []
  const oldResources = record(old.pathResources)
  const resources = { ...initialPathResources(), ...Object.fromEntries(Object.entries(oldResources).filter(([, entry]) => typeof entry === 'number')) } as Player['pathResources']
  const spiritRoot = migrateRoot(old.spiritRoot)
  const player: Player = {
    ...(old as unknown as Player), id, generation, origin, familyId, entryType, realmIndex,
    ageMonths: typeof old.ageMonths === 'number' ? old.ageMonths : 16 * 12,
    lifespanMonths: typeof old.lifespanMonths === 'number' ? old.lifespanMonths : 100 * 12,
    talents: migrateTalents(old.talents, generation), talentPoints: typeof old.talentPoints === 'number' ? old.talentPoints : CREATION_CONFIG.baseTalentPoints,
    bloodline: old.bloodline && typeof old.bloodline === 'object' ? old.bloodline as Player['bloodline'] : { familyId, familyName: `${typeof old.name === 'string' ? old.name.slice(0, 1) : '无'}氏`, bloodlineLevel: 1, inheritedTraits: [] },
    originSecret: typeof old.originSecret === 'string' ? old.originSecret as Player['originSecret'] : undefined,
    spiritRoot, spiritualAptitude: migrateAptitude(old.spiritualAptitude, spiritRoot), stats, statPotential: migratePotential(old.statPotential, stats, origin.id),
    statHistory: Array.isArray(old.statHistory) ? old.statHistory as Player['statHistory'] : [], inventory: Array.isArray(old.inventory) ? old.inventory as Player['inventory'] : [],
    achievements: Array.isArray(old.achievements) ? old.achievements as string[] : [], timeline: Array.isArray(old.timeline) ? old.timeline as Player['timeline'] : [],
    alive: old.alive !== false, deathFinalized: typeof old.deathFinalized === 'boolean' ? old.deathFinalized : old.alive === false,
    birthYear: typeof old.birthYear === 'number' ? old.birthYear : world.currentYear - 16,
    primaryPath, secondaryPaths: Array.isArray(old.secondaryPaths) ? old.secondaryPaths as CultivationPathProgress[] : [], pathProgress: pathProgressValue,
    pathResources: resources, unlockedPaths: Array.isArray(old.unlockedPaths) ? old.unlockedPaths.filter((entry): entry is CultivationPathId => validPaths.includes(entry as CultivationPathId)) : ['dao', 'sword', 'body'],
    soulStability: typeof old.soulStability === 'number' ? old.soulStability : primaryPath === 'ghost' ? 80 : undefined,
    lifespanFateModifier: typeof old.lifespanFateModifier === 'number' ? old.lifespanFateModifier : 0,
    lifespanBonusMonths: typeof old.lifespanBonusMonths === 'number' ? old.lifespanBonusMonths : 0,
    acquiredTalents: Array.isArray(old.acquiredTalents) ? old.acquiredTalents as Player['acquiredTalents'] : [],
    knownTechniques: Array.isArray(old.knownTechniques) ? old.knownTechniques.filter((entry): entry is string => typeof entry === 'string') : ['plain-breath'],
    activeTechnique: typeof old.activeTechnique === 'string' ? old.activeTechnique : undefined,
    techniqueProgress: Array.isArray(old.techniqueProgress) ? old.techniqueProgress as TechniqueProgress[] : [],
    nearDeathCount: typeof old.nearDeathCount === 'number' ? old.nearDeathCount : 0,
    dangerousEventCount: typeof old.dangerousEventCount === 'number' ? old.dangerousEventCount : 0,
    severeInjuryCount: typeof old.severeInjuryCount === 'number' ? old.severeInjuryCount : 0,
    luckyOutcomeStreak: typeof old.luckyOutcomeStreak === 'number' ? old.luckyOutcomeStreak : 0,
    rareEventCount: typeof old.rareEventCount === 'number' ? old.rareEventCount : 0,
    lateMajorBreakthroughs: typeof old.lateMajorBreakthroughs === 'number' ? old.lateMajorBreakthroughs : 0,
    lifeEventHistory: Array.isArray(old.lifeEventHistory) ? old.lifeEventHistory as Player['lifeEventHistory'] : [],
    fateTags: Array.isArray(old.fateTags) ? old.fateTags as Player['fateTags'] : [],
    fatePaths: Array.isArray(old.fatePaths) ? old.fatePaths as Player['fatePaths'] : [],
    lifeTimeline: Array.isArray(old.lifeTimeline) ? old.lifeTimeline as Player['lifeTimeline'] : [],
    importantEvents: Array.isArray(old.importantEvents) ? old.importantEvents as Player['importantEvents'] : [],
    cultivationLogs: migrateCultivationLogs(old.cultivationLogs),
    resources: { ...initialCultivationResources(), ...Object.fromEntries(Object.entries(record(old.resources)).filter(([, entry]) => typeof entry === 'number')) } as Player['resources'],
    characterStates: Array.isArray(old.characterStates) ? old.characterStates.filter((entry): entry is CharacterState => Object.values(CharacterState).includes(entry as CharacterState)) : [CharacterState.NORMAL],
    breakthroughHistory: Array.isArray(old.breakthroughHistory) ? old.breakthroughHistory as Player['breakthroughHistory'] : [],
    breakthroughProgress: typeof old.breakthroughProgress === 'number' ? Math.max(0, Math.min(100, old.breakthroughProgress)) : (typeof old.cultivation === 'number' && typeof old.cultivationRequired === 'number' && old.cultivation >= old.cultivationRequired ? 100 : 0),
    bodyRealm: Object.values(BodyRealm).includes(old.bodyRealm as BodyRealm) ? old.bodyRealm as BodyRealm : BODY_REALM_ORDER[Math.max(0, Math.min(5, typeof oldResources.bodyStage === 'number' ? oldResources.bodyStage : 0))],
    bodyTrainingProgress: typeof old.bodyTrainingProgress === 'number' ? Math.max(0, old.bodyTrainingProgress) : [0, 100, 250, 450, 700, 1000][Math.max(0, Math.min(5, typeof oldResources.bodyStage === 'number' ? oldResources.bodyStage : 0))],
    eventRiskHistory: Array.isArray(old.eventRiskHistory) ? old.eventRiskHistory as Player['eventRiskHistory'] : [],
    deathCause: old.deathCause && typeof old.deathCause === 'object' ? old.deathCause as Player['deathCause'] : typeof old.causeOfDeath === 'string' ? { category: old.causeOfDeath.includes('寿元') ? 'lifespan' : old.causeOfDeath.includes('魂飞魄散') ? 'soul-dispersal' : 'adventure', description: old.causeOfDeath } : undefined,
    dangerRecords: Array.isArray(old.dangerRecords) ? old.dangerRecords as Player['dangerRecords'] : [],
    majorOpportunities: Array.isArray(old.majorOpportunities) ? old.majorOpportunities as Player['majorOpportunities'] : [],
    inheritanceHistory: Array.isArray(old.inheritanceHistory) ? old.inheritanceHistory as Player['inheritanceHistory'] : [],
    sectMembership: old.sectMembership && typeof old.sectMembership === 'object' ? old.sectMembership as Player['sectMembership'] : undefined,
    masterId: typeof old.masterId === 'string' ? old.masterId : undefined,
    discipleIds: Array.isArray(old.discipleIds) ? old.discipleIds.filter((entry): entry is string => typeof entry === 'string') : [],
    socialHistory: Array.isArray(old.socialHistory) ? old.socialHistory as Player['socialHistory'] : [],
  }
  if (!player.unlockedPaths.length) player.unlockedPaths = ['dao', 'sword', 'body']
  if (!player.characterStates.length) player.characterStates = [CharacterState.NORMAL]
  if (sourceVersion < 5) player.lifespanMonths = Math.max(typeof old.lifespanMonths === 'number' ? old.lifespanMonths : 0, calculateMaxLifespanMonths(player))
  return player
}

function migrateLifeRecords(value: unknown): LifeRecord[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => {
    const old = record(entry)
    const generation = typeof old.generation === 'number' ? old.generation : 1
    return {
      ...(old as unknown as LifeRecord), generation,
      playerId: typeof old.playerId === 'string' ? old.playerId : `legacy-player-${generation}`,
      entryType: old.entryType === 'bloodline' || old.entryType === 'reincarnation' ? old.entryType : 'initial',
      familyId: typeof old.familyId === 'string' ? old.familyId : `legacy-family-${generation}`,
      achievements: Array.isArray(old.achievements) ? old.achievements as string[] : [], timeline: Array.isArray(old.timeline) ? old.timeline as LifeRecord['timeline'] : [],
      primaryPath: ['dao', 'sword', 'body', 'demonic', 'ghost'].includes(String(old.primaryPath)) ? old.primaryPath as CultivationPathId : undefined,
      secondaryPaths: Array.isArray(old.secondaryPaths) ? old.secondaryPaths as CultivationPathProgress[] : [],
      highestPathLevel: typeof old.highestPathLevel === 'number' ? old.highestPathLevel : 0,
      acquiredTalents: Array.isArray(old.acquiredTalents) ? old.acquiredTalents as LifeRecord['acquiredTalents'] : [],
      fateTags: Array.isArray(old.fateTags) ? old.fateTags as LifeRecord['fateTags'] : [],
      fatePaths: Array.isArray(old.fatePaths) ? old.fatePaths as LifeRecord['fatePaths'] : [],
      lifeTimeline: Array.isArray(old.lifeTimeline) ? old.lifeTimeline as LifeRecord['lifeTimeline'] : [],
      importantEvents: Array.isArray(old.importantEvents) ? old.importantEvents as LifeRecord['importantEvents'] : [],
      evaluationScore: typeof old.evaluationScore === 'number' ? old.evaluationScore : 0,
      evaluationTitle: typeof old.evaluationTitle === 'string' ? old.evaluationTitle : '平凡一生',
      cultivationLogs: migrateCultivationLogs(old.cultivationLogs),
      breakthroughHistory: Array.isArray(old.breakthroughHistory) ? old.breakthroughHistory as LifeRecord['breakthroughHistory'] : [],
      bodyRealm: Object.values(BodyRealm).includes(old.bodyRealm as BodyRealm) ? old.bodyRealm as BodyRealm : BodyRealm.SKIN,
      eventRiskHistory: Array.isArray(old.eventRiskHistory) ? old.eventRiskHistory as LifeRecord['eventRiskHistory'] : [],
      deathCause: old.deathCause && typeof old.deathCause === 'object' ? old.deathCause as LifeRecord['deathCause'] : undefined,
      dangerRecords: Array.isArray(old.dangerRecords) ? old.dangerRecords as LifeRecord['dangerRecords'] : [],
      majorOpportunities: Array.isArray(old.majorOpportunities) ? old.majorOpportunities as LifeRecord['majorOpportunities'] : [],
      inheritanceHistory: Array.isArray(old.inheritanceHistory) ? old.inheritanceHistory as LifeRecord['inheritanceHistory'] : [],
      sectMembership: old.sectMembership && typeof old.sectMembership === 'object' ? old.sectMembership as LifeRecord['sectMembership'] : undefined,
      socialHistory: Array.isArray(old.socialHistory) ? old.socialHistory as LifeRecord['socialHistory'] : [],
      relationshipSummary: old.relationshipSummary && typeof old.relationshipSummary === 'object' ? old.relationshipSummary as LifeRecord['relationshipSummary'] : { friends: 0, rivals: 0, enemies: 0, disciples: 0 },
    }
  })
}

export function migrateSave(value: unknown): GameSave {
  const old = record(value)
  if (!('world' in old)) throw new Error('这不是有效的《长生录》存档。')
  const oldWorld = record(old.world)
  const seed = typeof oldWorld.seed === 'string' && oldWorld.seed.trim() ? oldWorld.seed.trim().toUpperCase() : stableLegacySeed(oldWorld)
  const baseWorld = createWorld(seed)
  const sects = migrateSects(oldWorld.sects, baseWorld.sects)
  const migrationRandom = createSeededRandom(`${seed}:v11-migration`)
  const migrationYear = typeof oldWorld.currentYear === 'number' ? oldWorld.currentYear : baseWorld.currentYear
  const npcSource = Array.isArray(oldWorld.npcCultivators) ? oldWorld.npcCultivators : Array.isArray(oldWorld.npcs) && oldWorld.npcs.length ? oldWorld.npcs : baseWorld.npcCultivators
  const world: WorldState = {
    ...baseWorld, ...(oldWorld as Partial<WorldState>),
    seed,
    continent: oldWorld.continent && typeof oldWorld.continent === 'object' ? oldWorld.continent as WorldState['continent'] : generateContinent(seed),
    worldEvents: Array.isArray(oldWorld.worldEvents) ? oldWorld.worldEvents as WorldState['worldEvents'] : [],
    sects,
    npcs: Array.isArray(oldWorld.npcs) ? oldWorld.npcs as WorldState['npcs'] : [],
    npcCultivators: migrateNPCCultivators(npcSource),
    relationships: Array.isArray(oldWorld.relationships) ? oldWorld.relationships as WorldState['relationships'] : [],
    sectRelations: Array.isArray(oldWorld.sectRelations) ? oldWorld.sectRelations as WorldState['sectRelations'] : initialSectRelations(sects, migrationYear),
    territories: Array.isArray(oldWorld.territories) ? oldWorld.territories as WorldState['territories'] : generateTerritories(sects, migrationRandom),
    masterDisciples: Array.isArray(oldWorld.masterDisciples) ? oldWorld.masterDisciples as WorldState['masterDisciples'] : [],
    descendants: migrateDescendants(oldWorld.descendants),
    families: migrateFamilies(oldWorld.families),
  }
  const now = new Date().toISOString()
  const save: GameSave = {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: typeof old.createdAt === 'string' ? old.createdAt : now,
    updatedAt: typeof old.updatedAt === 'string' ? old.updatedAt : now, player: migratePlayer(old.player, world, typeof old.version === 'number' ? old.version : 1), world,
    lifeRecords: migrateLifeRecords(old.lifeRecords), reincarnation: migrateReincarnation(old.reincarnation),
    settings: { fortunateMode: true, autoSave: true, logLimit: 120, ...(record(old.settings) as Partial<GameSave['settings']>) },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0, ...(record(old.pity) as Partial<GameSave['pity']>) },
    logs: Array.isArray(old.logs) ? old.logs as GameSave['logs'] : [], pendingEvent: old.pendingEvent && typeof old.pendingEvent === 'object' ? old.pendingEvent as GameSave['pendingEvent'] : null,
    pendingLifeEvent: old.pendingLifeEvent && typeof old.pendingLifeEvent === 'object' ? old.pendingLifeEvent as GameSave['pendingLifeEvent'] : null,
    currentAction: old.currentAction && typeof old.currentAction === 'object' && Object.values(CultivationAction).includes(record(old.currentAction).action as CultivationAction) ? old.currentAction as GameSave['currentAction'] : null,
  }
  if (save.player && !save.world.families.some((family) => family.id === save.player!.familyId)) {
    save.world.families.push({ id: save.player.familyId, name: save.player.bloodline.familyName, founderId: save.player.id, foundedYear: save.player.birthYear, wealth: 0, inventory: [], reputation: 0, bloodline: save.player.bloodline, memberIds: [save.player.id], kind: '凡人家族', resources: 0, fame: 0, territory: '故乡村镇', history: [] })
  }
  return save
}

export function serializeSave(save: GameSave) { return JSON.stringify({ ...save, version: CURRENT_SAVE_VERSION }, null, 2) }
export function deserializeSave(value: string): GameSave { return migrateSave(JSON.parse(value) as unknown) }
