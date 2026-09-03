import { originById } from '../../data/origins'
import { CREATION_CONFIG } from '../../data/creationConfig'
import { createSpiritRoot, MUTATED_ELEMENTS, STANDARD_ELEMENTS } from '../../data/spiritRoots'
import { instantiateTalent, talentById } from '../../data/talents'
import type { CultivationPathId, CultivationPathProgress, Descendant, EntryType, GameSave, LifeRecord, Player, PlayerStats, ReincarnationState, SpiritElement, SpiritRoot, SpiritRootQuality, TalentDefinition, TalentInstance, WorldState } from '../../models'
import { initialReincarnation } from '../reincarnation/reincarnation'
import { createWorld, generateContinent, stableLegacySeed } from '../world/world'
import { initialPathResources } from '../paths/paths'
import { calculateMaxLifespanMonths } from '../lifespan/lifespan'

export const CURRENT_SAVE_VERSION = 5
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
  const entryType: EntryType = old.entryType === 'bloodline' || old.entryType === 'reincarnation' ? old.entryType : 'initial'
  const stats = old.stats as PlayerStats
  const validPaths: CultivationPathId[] = ['dao', 'sword', 'body', 'demonic', 'ghost']
  const primaryPath = validPaths.includes(old.primaryPath as CultivationPathId) ? old.primaryPath as CultivationPathId : undefined
  const pathProgressValue = Array.isArray(old.pathProgress) ? old.pathProgress.filter((entry): entry is CultivationPathProgress => validPaths.includes(record(entry).pathId as CultivationPathId)) : []
  const oldResources = record(old.pathResources)
  const resources = { ...initialPathResources(), ...Object.fromEntries(Object.entries(oldResources).filter(([, entry]) => typeof entry === 'number')) } as Player['pathResources']
  const player: Player = {
    ...(old as unknown as Player), id, generation, origin, familyId, entryType,
    talents: migrateTalents(old.talents, generation), talentPoints: typeof old.talentPoints === 'number' ? old.talentPoints : CREATION_CONFIG.baseTalentPoints,
    bloodline: old.bloodline && typeof old.bloodline === 'object' ? old.bloodline as Player['bloodline'] : { familyId, familyName: `${typeof old.name === 'string' ? old.name.slice(0, 1) : '无'}氏`, bloodlineLevel: 1, inheritedTraits: [] },
    originSecret: typeof old.originSecret === 'string' ? old.originSecret as Player['originSecret'] : undefined,
    spiritRoot: migrateRoot(old.spiritRoot), stats, statPotential: migratePotential(old.statPotential, stats, origin.id),
    statHistory: Array.isArray(old.statHistory) ? old.statHistory as Player['statHistory'] : [], inventory: Array.isArray(old.inventory) ? old.inventory as Player['inventory'] : [],
    achievements: Array.isArray(old.achievements) ? old.achievements as string[] : [], timeline: Array.isArray(old.timeline) ? old.timeline as Player['timeline'] : [],
    alive: old.alive !== false, birthYear: typeof old.birthYear === 'number' ? old.birthYear : world.currentYear - 16,
    primaryPath, secondaryPaths: Array.isArray(old.secondaryPaths) ? old.secondaryPaths as CultivationPathProgress[] : [], pathProgress: pathProgressValue,
    pathResources: resources, unlockedPaths: Array.isArray(old.unlockedPaths) ? old.unlockedPaths.filter((entry): entry is CultivationPathId => validPaths.includes(entry as CultivationPathId)) : ['dao', 'sword', 'body'],
    soulStability: typeof old.soulStability === 'number' ? old.soulStability : primaryPath === 'ghost' ? 80 : undefined,
    lifespanFateModifier: typeof old.lifespanFateModifier === 'number' ? old.lifespanFateModifier : 0,
    lifespanBonusMonths: typeof old.lifespanBonusMonths === 'number' ? old.lifespanBonusMonths : 0,
  }
  if (!player.unlockedPaths.length) player.unlockedPaths = ['dao', 'sword', 'body']
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
    }
  })
}

export function migrateSave(value: unknown): GameSave {
  const old = record(value)
  if (!('world' in old)) throw new Error('这不是有效的《长生录》存档。')
  const oldWorld = record(old.world)
  const seed = typeof oldWorld.seed === 'string' && oldWorld.seed.trim() ? oldWorld.seed.trim().toUpperCase() : stableLegacySeed(oldWorld)
  const baseWorld = createWorld(seed)
  const world: WorldState = {
    ...baseWorld, ...(oldWorld as Partial<WorldState>),
    seed,
    continent: oldWorld.continent && typeof oldWorld.continent === 'object' ? oldWorld.continent as WorldState['continent'] : generateContinent(seed),
    worldEvents: Array.isArray(oldWorld.worldEvents) ? oldWorld.worldEvents as WorldState['worldEvents'] : [],
    sects: Array.isArray(oldWorld.sects) ? oldWorld.sects as WorldState['sects'] : baseWorld.sects,
    npcs: Array.isArray(oldWorld.npcs) ? oldWorld.npcs as WorldState['npcs'] : [],
    descendants: migrateDescendants(oldWorld.descendants),
    families: Array.isArray(oldWorld.families) ? oldWorld.families as WorldState['families'] : [],
  }
  const now = new Date().toISOString()
  const save: GameSave = {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: typeof old.createdAt === 'string' ? old.createdAt : now,
    updatedAt: typeof old.updatedAt === 'string' ? old.updatedAt : now, player: migratePlayer(old.player, world, typeof old.version === 'number' ? old.version : 1), world,
    lifeRecords: migrateLifeRecords(old.lifeRecords), reincarnation: migrateReincarnation(old.reincarnation),
    settings: { fortunateMode: true, autoSave: true, logLimit: 120, ...(record(old.settings) as Partial<GameSave['settings']>) },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0, ...(record(old.pity) as Partial<GameSave['pity']>) },
    logs: Array.isArray(old.logs) ? old.logs as GameSave['logs'] : [], pendingEvent: old.pendingEvent && typeof old.pendingEvent === 'object' ? old.pendingEvent as GameSave['pendingEvent'] : null,
  }
  if (save.player && !save.world.families.some((family) => family.id === save.player!.familyId)) {
    save.world.families.push({ id: save.player.familyId, name: save.player.bloodline.familyName, founderId: save.player.id, foundedYear: save.player.birthYear, wealth: 0, inventory: [], reputation: 0, bloodline: save.player.bloodline, memberIds: [save.player.id] })
  }
  return save
}

export function serializeSave(save: GameSave) { return JSON.stringify({ ...save, version: CURRENT_SAVE_VERSION }, null, 2) }
export function deserializeSave(value: string): GameSave { return migrateSave(JSON.parse(value) as unknown) }
