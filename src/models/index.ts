export type StatKey = 'comprehension' | 'luck' | 'constitution' | 'soul' | 'charm'
export type ItemQuality = '凡品' | '良品' | '精品' | '稀有' | '极品' | '奇珍'
export type ItemType = '丹药' | '材料' | '法器' | '特殊' | '传承'

export interface Stats {
  comprehension: number
  luck: number
  constitution: number
  soul: number
  charm: number
}

export interface SpiritRoot {
  id: string
  name: string
  rank: number
  multiplier: number
  elements: string[]
}

export interface Talent {
  id: string
  name: string
  description: string
  cultivationMultiplier?: number
  breakthroughBonus?: number
  lifespanYears?: number
  statChanges?: Partial<Stats>
}

export interface Origin {
  id: string
  name: string
  description: string
  stones: number
  statChanges: Partial<Stats>
  rootLuck: number
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
  stats: Stats
  spiritStones: number
  inventory: InventoryItem[]
  talents: Talent[]
  origin: Origin
  alive: boolean
  causeOfDeath?: string
  achievements: string[]
  timeline: TimelineEvent[]
}

export interface RealmDefinition {
  id: string
  name: string
  group: '凡人' | '炼气' | '筑基' | '金丹' | '元婴'
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
  currentYear: number
  currentMonth: number
  eraName: string
  worldEvents: WorldEvent[]
  sects: SectState[]
  npcs: NPC[]
}

export interface LifeRecord {
  generation: number
  playerName: string
  birthYear: number
  deathYear: number
  maxRealm: string
  lifespan: number
  causeOfDeath: string
  achievements: string[]
  timeline: TimelineEvent[]
  pointsEarned: number
}

export interface ReincarnationState {
  totalPoints: number
  upgrades: Record<'comprehensionBonus' | 'luckBonus' | 'constitutionBonus' | 'spiritRootLuck', number>
}

export interface PityState { rollsWithoutRare: number; rollsWithoutEpic: number }
export interface GameSettings { fortunateMode: boolean; autoSave: boolean; logLimit: number }

export type EffectType = 'stones' | 'cultivation' | 'lifespan' | 'stat' | 'item' | 'death'
export interface EventEffect { type: EffectType; value?: number; stat?: StatKey; itemId?: string; text: string }
export interface EventRequirement { stat?: StatKey; min?: number; realmIndex?: number }
export interface EventOption { id: string; label: string; requirement?: EventRequirement; effects: EventEffect[] }
export interface GameEvent { id: string; title: string; description: string; weight: number; minRealmIndex?: number; options: EventOption[] }

export interface PendingEvent { eventId: string }
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
