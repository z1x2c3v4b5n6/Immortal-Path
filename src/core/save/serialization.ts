import { originById } from '../../data/origins'
import { SPIRIT_ROOT_ARCHETYPES } from '../../data/spiritRoots'
import { instantiateTalent, talentById } from '../../data/talents'
import type { EntryType, GameSave, LifeRecord, Player, ReincarnationState, TalentDefinition, TalentInstance, WorldState } from '../../models'
import { initialReincarnation } from '../reincarnation/reincarnation'
import { createWorld } from '../world/world'

export const CURRENT_SAVE_VERSION = 2
type UnknownRecord = Record<string, unknown>
const record = (value: unknown): UnknownRecord => value && typeof value === 'object' ? value as UnknownRecord : {}

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
  if (typeof old.rareEventCount === 'number') next.rareEventCount = old.rareEventCount
  const oldSelections = record(old.selections)
  if (Object.keys(oldSelections).length) next.selections = { ...next.selections, ...oldSelections }
  next.inHall = old.inHall === true
  const upgrades = record(old.upgrades)
  const legacyLevels = Object.values(upgrades).reduce<number>((sum, level) => sum + (typeof level === 'number' ? level : 0), 0)
  next.totalPoints += legacyLevels * 30
  return next
}

function migratePlayer(value: unknown, world: WorldState): Player | null {
  if (!value || typeof value !== 'object') return null
  const old = record(value)
  const generation = typeof old.generation === 'number' ? old.generation : 1
  const oldOrigin = record(old.origin)
  const origin = originById(typeof oldOrigin.id === 'string' ? oldOrigin.id : 'farmer')
  const id = typeof old.id === 'string' ? old.id : crypto.randomUUID()
  const familyId = typeof old.familyId === 'string' ? old.familyId : `family-${id}`
  const entryType: EntryType = old.entryType === 'bloodline' || old.entryType === 'reincarnation' ? old.entryType : 'initial'
  return {
    ...(old as unknown as Player), id, generation, origin, familyId, entryType,
    talents: migrateTalents(old.talents, generation), talentPoints: typeof old.talentPoints === 'number' ? old.talentPoints : origin.talentPoints,
    bloodline: old.bloodline && typeof old.bloodline === 'object' ? old.bloodline as Player['bloodline'] : { familyId, familyName: `${typeof old.name === 'string' ? old.name.slice(0, 1) : '无'}氏`, bloodlineLevel: 1, inheritedTraits: [] },
    originSecret: typeof old.originSecret === 'string' ? old.originSecret as Player['originSecret'] : undefined,
    spiritRoot: old.spiritRoot && typeof old.spiritRoot === 'object' ? old.spiritRoot as Player['spiritRoot'] : SPIRIT_ROOT_ARCHETYPES[0],
    stats: old.stats as Player['stats'], inventory: Array.isArray(old.inventory) ? old.inventory as Player['inventory'] : [],
    achievements: Array.isArray(old.achievements) ? old.achievements as string[] : [], timeline: Array.isArray(old.timeline) ? old.timeline as Player['timeline'] : [],
    alive: old.alive !== false, birthYear: typeof old.birthYear === 'number' ? old.birthYear : world.currentYear - 16,
  }
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
    }
  })
}

export function migrateSave(value: unknown): GameSave {
  const old = record(value)
  if (!('world' in old)) throw new Error('这不是有效的《长生录》存档。')
  const baseWorld = createWorld()
  const oldWorld = record(old.world)
  const world: WorldState = {
    ...baseWorld, ...(oldWorld as Partial<WorldState>),
    worldEvents: Array.isArray(oldWorld.worldEvents) ? oldWorld.worldEvents as WorldState['worldEvents'] : [],
    sects: Array.isArray(oldWorld.sects) ? oldWorld.sects as WorldState['sects'] : baseWorld.sects,
    npcs: Array.isArray(oldWorld.npcs) ? oldWorld.npcs as WorldState['npcs'] : [],
    descendants: Array.isArray(oldWorld.descendants) ? oldWorld.descendants as WorldState['descendants'] : [],
    families: Array.isArray(oldWorld.families) ? oldWorld.families as WorldState['families'] : [],
  }
  const now = new Date().toISOString()
  const save: GameSave = {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: typeof old.createdAt === 'string' ? old.createdAt : now,
    updatedAt: typeof old.updatedAt === 'string' ? old.updatedAt : now, player: migratePlayer(old.player, world), world,
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
