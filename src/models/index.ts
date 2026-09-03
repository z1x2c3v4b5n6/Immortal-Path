export type StatKey = 'comprehension' | 'luck' | 'constitution' | 'soul' | 'charm'
export type PlayerStats = Record<StatKey, number>
export type ItemQuality = '凡品' | '良品' | '精品' | '稀有' | '极品' | '奇珍'
export type ItemType = '丹药' | '材料' | '法器' | '特殊' | '传承'
export type EntryType = 'initial' | 'bloodline' | 'reincarnation'
export type TalentQuality = '普通' | '优秀' | '稀有' | '极品' | '传说'
export type OriginSecret = '普通弃婴' | '修士遗孤' | '魔修血脉' | '妖族血脉' | '大能转世' | '古族后裔'
export type CultivationPathId = 'dao' | 'sword' | 'body' | 'demonic' | 'ghost'
export type WorldEraId = 'DECLINING' | 'NORMAL' | 'PROSPEROUS' | 'GOLDEN'
export type WorldStrengthLevel = 'BARREN' | 'COMMON' | 'THRIVING' | 'POWERFUL' | 'SUPREME'

export interface Modifier { type: string; value: number; description: string }
export interface WorldModifier { type: string; value: number; pathId?: CultivationPathId }
export interface WorldTrait { id: string; name: string; description: string; modifiers: WorldModifier[]; weight: number; incompatibleWith?: string[] }
export interface CultivationEnvironment {
  spiritualQiMultiplier: number
  yinQiMultiplier: number
  dangerMultiplier: number
  resourceMultiplier: number
  eventFrequencyMultiplier: number
}
export interface ContinentState {
  id: string
  name: string
  era: WorldEraId
  strengthLevel: WorldStrengthLevel
  traits: WorldTrait[]
  cultivationEnvironment: CultivationEnvironment
  pathDistribution: Record<CultivationPathId, number>
  resourceTendency: string
}

export interface CultivationPathProgress { pathId: CultivationPathId; experience: number; level: number }
export interface PathResources {
  swordIntent: number
  qiBlood: number
  maxQiBlood: number
  bodyStage: number
  demonicNature: number
  innerDemon: number
  karma: number
  bloodRiteMonthsRemaining: number
}

export type SpiritElement = '金' | '木' | '水' | '火' | '土' | '雷' | '冰' | '风' | '暗' | '光'
export type SpiritRootQuality = 'NORMAL' | 'PURE' | 'HEAVENLY'

export interface SpiritRoot {
  id: string
  name: string
  elements: SpiritElement[]
  quality: SpiritRootQuality
  mutations: SpiritElement[]
  cultivationMultiplier: number
  specializationMultiplier: number
  breakthroughModifier: number
  statPointBonus: number
}

export interface TalentEffect {
  type: 'stat' | 'cultivationMultiplier' | 'breakthroughBonus' | 'lifespanMultiplier' | 'eventWeight' | 'future'
  stat?: StatKey
  value: number
}

export interface UnlockRequirement { type: 'achievement' | 'rareEvents' | 'generation'; value: string | number; description: string }

export interface TalentDefinition {
  id: string
  name: string
  quality: TalentQuality
  cost: number
  description: string
  effects: TalentEffect[]
  unlockRequirement?: UnlockRequirement
  firstGenerationAvailable: boolean
}

export interface TalentInstance extends TalentDefinition { acquiredGeneration: number }

export interface OriginDefinition {
  id: string
  name: string
  description: string
  baseStats: PlayerStats
  statCaps: PlayerStats
  freeStatPoints: number
  startingRealmIndex: number
  startingCultivation: number
  startingSpiritStones: number
  modifiers: Modifier[]
  tags: string[]
  firstGenerationAvailable: boolean
  unlockCost?: number
}

export interface BloodlineState {
  familyId: string
  familyName: string
  bloodlineLevel: number
  inheritedTraits: string[]
}

export interface InventoryItem { itemId: string; quantity: number }

export interface Player {
  id: string
  name: string
  generation: number
  birthYear: number
  ageMonths: number
  lifespanMonths: number
  realmIndex: number
  cultivation: number
  cultivationRequired: number
  spiritRoot: SpiritRoot
  stats: PlayerStats
  statPotential: PlayerStats
  statHistory: StatChangeRecord[]
  spiritStones: number
  inventory: InventoryItem[]
  talents: TalentInstance[]
  talentPoints: number
  origin: OriginDefinition
  originSecret?: OriginSecret
  familyId: string
  bloodline: BloodlineState
  entryType: EntryType
  parentId?: string
  predecessorName?: string
  alive: boolean
  causeOfDeath?: string
  achievements: string[]
  timeline: TimelineEvent[]
  primaryPath?: CultivationPathId
  secondaryPaths: CultivationPathProgress[]
  pathProgress: CultivationPathProgress[]
  pathResources: PathResources
  unlockedPaths: CultivationPathId[]
  soulStability?: number
  lifespanFateModifier: number
  lifespanBonusMonths: number
}

export interface Descendant {
  id: string
  name: string
  parents: string[]
  generation: number
  birthYear: number
  ageMonths: number
  lifespanMonths: number
  realmIndex: number
  cultivation: number
  spiritRoot: SpiritRoot
  stats: PlayerStats
  statPotential: PlayerStats
  talents: TalentInstance[]
  origin: OriginDefinition
  bloodlineTags: string[]
  familyId: string
  alive: boolean
  isPlayer?: boolean
  inventory: InventoryItem[]
  spiritStones: number
}

export interface FamilyState {
  id: string
  name: string
  founderId: string
  foundedYear: number
  wealth: number
  inventory: InventoryItem[]
  reputation: number
  bloodline: BloodlineState
  memberIds: string[]
}

export interface StatChangeRecord {
  year: number
  month: number
  stat: StatKey
  delta: number
  reason: string
  exceededPotential: boolean
}

export interface RealmDefinition {
  id: string
  name: string
  group: '凡人' | '炼气' | '筑基' | '金丹' | '元婴' | '化神' | '炼虚' | '合体' | '大乘' | '渡劫'
  cultivationRequired: number
  baseLifespanYears: number
  breakthroughBaseChance: number
  cultivationBase: number
}

export interface ItemDefinition {
  id: string
  name: string
  type: ItemType
  quality: ItemQuality
  requiredRealmIndex?: number
  description: string
  effects?: { type: 'cultivation' | 'lifespan' | 'stone'; value: number }[]
}

export interface TimelineEvent { year: number; month: number; text: string; type: 'life' | 'realm' | 'event' | 'loot' | 'death' }
export interface LogEntry extends TimelineEvent { id: string }
export interface WorldEvent { id: string; year: number; text: string }
export interface SectState { id: string; name: string; power: number; status: string }
export interface NPC { id: string; name: string; ageMonths: number; lifespanMonths: number; realmIndex: number; alive: boolean; relationship: number }

export interface WorldState {
  seed: string
  continent: ContinentState
  currentYear: number
  currentMonth: number
  eraName: string
  worldEvents: WorldEvent[]
  sects: SectState[]
  npcs: NPC[]
  descendants: Descendant[]
  families: FamilyState[]
}

export interface LifeRecord {
  generation: number
  playerName: string
  playerId: string
  birthYear: number
  deathYear: number
  maxRealm: string
  lifespan: number
  causeOfDeath: string
  achievements: string[]
  timeline: TimelineEvent[]
  pointsEarned: number
  entryType: EntryType
  parentId?: string
  predecessorName?: string
  familyId: string
  primaryPath?: CultivationPathId
  secondaryPaths: CultivationPathProgress[]
  highestPathLevel: number
}

export interface ReincarnationSelections {
  extraTalentPoints: number
  statCapBonus: number
  maxTalentQuality: TalentQuality
  canChooseSingleRoot: boolean
  canChooseMutatedElements: boolean
  maxRootQuality: SpiritRootQuality
  advancedOriginAccess: boolean
  carryMemory: boolean
}

export interface ReincarnationState {
  totalPoints: number
  unlockedTalents: string[]
  unlockedOrigins: string[]
  rareEventCount: number
  rareLootCount: number
  selections: ReincarnationSelections
  inHall: boolean
}

export interface PityState { rollsWithoutRare: number; rollsWithoutEpic: number }
export interface GameSettings { fortunateMode: boolean; autoSave: boolean; logLimit: number }

export type EffectType = 'stones' | 'cultivation' | 'lifespan' | 'stat' | 'item' | 'death' | 'pathResource' | 'pathExperience' | 'unlockPath' | 'soulStability'
export interface EventEffect { type: EffectType; value?: number; stat?: StatKey; itemId?: string; pathId?: CultivationPathId; resource?: keyof PathResources; text: string }
export interface EventRequirement { stat?: StatKey; min?: number; realmIndex?: number }
export type EventOutcomeTag = 'rare' | 'danger' | 'insight'
export interface EventOutcome {
  id: string
  weight: number
  requirements?: EventRequirement[]
  effects: EventEffect[]
  resultText: string
  tags?: EventOutcomeTag[]
}
export interface EventOption {
  id: string
  label: string
  requirement?: EventRequirement
  outcomes: EventOutcome[]
}
export interface GameEvent { id: string; title: string; description: string; weight: number; minRealmIndex?: number; pathRequirements?: CultivationPathId[]; pathWeights?: Partial<Record<CultivationPathId, number>>; options: EventOption[] }

export interface PendingEvent { eventId: string }
export interface CharacterBuild {
  name: string
  originId: string
  spiritRoot: SpiritRoot
  stats: PlayerStats
  talentIds: string[]
  talentBudget: number
  randomRoot: boolean
  randomTalents: boolean
}

export interface GameSave {
  id: 'main'
  version: number
  createdAt: string
  updatedAt: string
  player: Player | null
  world: WorldState
  lifeRecords: LifeRecord[]
  reincarnation: ReincarnationState
  settings: GameSettings
  pity: PityState
  logs: LogEntry[]
  pendingEvent: PendingEvent | null
}
