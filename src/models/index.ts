export type StatKey = 'comprehension' | 'luck' | 'constitution' | 'soul' | 'charm'
export type PlayerStats = Record<StatKey, number>
export type ItemQuality = '凡品' | '良品' | '精品' | '稀有' | '极品' | '奇珍'
export type ItemType = '丹药' | '材料' | '法器' | '特殊' | '传承'
export type EntryType = 'initial' | 'bloodline' | 'reincarnation'
export type TalentQuality = '普通' | '优秀' | '稀有' | '极品' | '传说'
export type OriginSecret = '普通弃婴' | '修士遗孤' | '魔修血脉' | '妖族血脉' | '大能转世' | '古族后裔'
export type CultivationPathId = 'dao' | 'sword' | 'body' | 'demonic' | 'ghost'
export type SectType = '剑宗' | '丹宗' | '器宗' | '佛门' | '魔宗' | '鬼宗' | '体宗' | '散修联盟'
export type SectPosition = '杂役弟子' | '外门弟子' | '内门弟子' | '真传弟子' | '长老' | '太上长老'
export type RelationshipType = '好友' | '师徒' | '竞争' | '敌对' | '仇恨' | '恩情'
export type SectRelationType = '盟友' | '中立' | '敌对'
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

export type TechniqueGrade = '黄阶' | '玄阶' | '地阶' | '天阶'
export interface AcquiredSpiritRoot { id: string; element: SpiritElement; purity: number; stability: number; source: string; acquiredYear: number; acquiredMonth: number }
export interface SpiritualAptitudeState {
  innateRoot: SpiritRoot
  acquiredRoots: AcquiredSpiritRoot[]
  elementalGrowth: Record<SpiritElement, number>
  elementalPurity: Record<SpiritElement, number>
}
export interface TechniqueElementRequirement { element: SpiritElement; weight: number }
export interface TechniqueEffect { type: string; value: number; description: string }
export interface TechniqueDefinition {
  id: string
  name: string
  grade: TechniqueGrade
  description: string
  elements: TechniqueElementRequirement[]
  preferredPaths: CultivationPathId[]
  baseCultivationEfficiency: number
  maxLevel: number
  minimumAffinity?: number
  rootDependency: number
  effects: TechniqueEffect[]
}
export interface TechniqueProgress { techniqueId: string; experience: number; level: number }
export interface AcquiredTalentInstance { talentId: string; name: string; acquiredYear: number; acquiredMonth: number; source: string }

export enum LifeStage { CHILDHOOD = 'CHILDHOOD', TEENAGE = 'TEENAGE', MORTAL = 'MORTAL', EARLY_CULTIVATION = 'EARLY_CULTIVATION', MID_CULTIVATION = 'MID_CULTIVATION', LATE_CULTIVATION = 'LATE_CULTIVATION', OLD_AGE = 'OLD_AGE' }
export enum CultivationAction { MEDITATION = 'MEDITATION', ADVENTURE = 'ADVENTURE', ENLIGHTENMENT = 'ENLIGHTENMENT', BODY_TRAINING = 'BODY_TRAINING', TRAVEL = 'TRAVEL', RECOVERY = 'RECOVERY' }
export enum CharacterState { NORMAL = 'NORMAL', INJURED = 'INJURED', SERIOUS_INJURY = 'SERIOUS_INJURY', INNER_DEMON = 'INNER_DEMON', ENLIGHTENED = 'ENLIGHTENED', BOTTLENECK = 'BOTTLENECK' }
export enum BodyRealm { SKIN = 'SKIN', FLESH = 'FLESH', BONE = 'BONE', VISCERA = 'VISCERA', BLOOD = 'BLOOD', GOLDEN_BODY = 'GOLDEN_BODY' }
export interface CultivationResources { spiritHerbs: number; beastCores: number; bodyMaterials: number; soulCrystals: number }
export interface CurrentAction { action: CultivationAction; startedYear: number; durationYears: number }
export type ActionResultType = 'ordinary' | 'technique-breakthrough' | 'insight' | 'bottleneck' | 'inner-demon' | 'resource' | 'danger' | 'recovery'
export interface CultivationLog { id: string; year: number; month: number; action: CultivationAction; years: number; title: string; summary: string; cultivationGain: number; techniqueExperience: number; resultType: ActionResultType; importance: 1 | 2 | 3 | 4 }
export interface BreakthroughRecord { id: string; year: number; month: number; fromRealm: string; toRealm: string; success: boolean; chance: number; result: string; lifespanBefore: number; lifespanAfter: number }
export type LifeEventConditionType = 'MIN_AGE' | 'MAX_AGE' | 'MIN_REALM' | 'MAX_REALM' | 'PATH' | 'ROOT_ELEMENT' | 'ROOT_COUNT' | 'TALENT' | 'ACQUIRED_TALENT' | 'FATE_TAG' | 'NOT_FATE_TAG' | 'HISTORY_TAG' | 'WORLD_TRAIT' | 'MIN_STAT' | 'HAS_SECT' | 'SECT_TYPE' | 'HOSTILE_SECT' | 'HAS_MASTER' | 'RELATIONSHIP_TYPE' | 'FAMILY_KIND'
export interface EventCondition { type: LifeEventConditionType; value: string | number; stat?: StatKey }
export type LifeEventEffectType = 'ADD_STAT' | 'ADD_CULTIVATION' | 'ADD_STONES' | 'ADD_ITEM' | 'ADD_RESOURCE' | 'ADD_STATE' | 'ADD_ELEMENT_GROWTH' | 'ADD_SOUL_STABILITY' | 'LEARN_TECHNIQUE' | 'ACQUIRE_ROOT' | 'TRIGGER_TALENT' | 'ADD_FATE_TAG' | 'REMOVE_FATE_TAG' | 'ADD_TIMELINE' | 'ADD_PATH_RESOURCE' | 'ADD_CONTRIBUTION' | 'ADD_RELATIONSHIP' | 'ADD_FAMILY_RESOURCE'
export interface LifeEventEffect { type: LifeEventEffectType; value: string | number; stat?: StatKey; element?: SpiritElement; purity?: number; stability?: number; pathResource?: keyof PathResources; resource?: keyof CultivationResources; state?: CharacterState; relationshipType?: RelationshipType; text?: string }
export interface EventChoice { id: string; label: string; description?: string; result: string; effects: LifeEventEffect[]; riskModifier?: number; rewardModifier?: number }
export interface LifeEvent { id: string; name: string; description: string; stage: LifeStage; conditions: EventCondition[]; choices: EventChoice[]; weight: number; cooldown: number; tags: string[]; importance: 1 | 2 | 3 | 4; riskLevel: 0 | 1 | 2 | 3 | 4; rewardLevel: 1 | 2 | 3 | 4; dangerTags: string[]; recommendedRealmIndex?: number }
export interface FateTag { id: string; name: string; description: string; createdAt: number }
export interface LifeEventRecord { eventId: string; eventName: string; year: number; month: number; age: number; choice: string; choiceLabel: string; result: string; importance: 1 | 2 | 3 | 4; tags: string[] }
export interface LifeTimelineEntry { id: string; year: number; month: number; age: number; text: string; type: 'begin' | 'event' | 'realm' | 'inheritance' | 'danger' | 'talent' | 'fate' | 'death'; importance: 1 | 2 | 3 | 4 }
export interface FatePathState { id: string; name: string; description: string; progress: number; status: 'forming' | 'completed'; milestones: string[]; evaluation: number; completedYear?: number }
export type DeathCauseCategory = 'lifespan' | 'combat' | 'adventure' | 'breakthrough' | 'inner-demon' | 'restriction' | 'possession' | 'soul-dispersal'
export interface DeathCauseDetail { category: DeathCauseCategory; description: string; eventId?: string }
export interface EventRiskRecord { eventId: string; eventName: string; year: number; choiceId: string; riskLevel: number; rewardLevel: number; deathChance: number; severeInjuryChance: number; outcome: 'safe' | 'injured' | 'severe-injury' | 'death' | 'turning-point' }
export interface DangerRecord { eventId: string; year: number; source: string; result: string; survived: boolean }
export interface MajorOpportunityRecord { eventId: string; name: string; year: number; rewardLevel: number; result: string }
export interface InheritanceRecord { eventId: string; name: string; year: number; source: string }

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
  deathFinalized: boolean
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
  spiritualAptitude: SpiritualAptitudeState
  acquiredTalents: AcquiredTalentInstance[]
  knownTechniques: string[]
  activeTechnique?: string
  techniqueProgress: TechniqueProgress[]
  nearDeathCount: number
  dangerousEventCount: number
  severeInjuryCount: number
  luckyOutcomeStreak: number
  rareEventCount: number
  lateMajorBreakthroughs: number
  lifeEventHistory: LifeEventRecord[]
  fateTags: FateTag[]
  fatePaths: FatePathState[]
  lifeTimeline: LifeTimelineEntry[]
  importantEvents: LifeTimelineEntry[]
  cultivationLogs: CultivationLog[]
  resources: CultivationResources
  characterStates: CharacterState[]
  breakthroughHistory: BreakthroughRecord[]
  breakthroughProgress: number
  bodyRealm: BodyRealm
  bodyTrainingProgress: number
  eventRiskHistory: EventRiskRecord[]
  deathCause?: DeathCauseDetail
  dangerRecords: DangerRecord[]
  majorOpportunities: MajorOpportunityRecord[]
  inheritanceHistory: InheritanceRecord[]
  sectMembership?: SectMembership
  masterId?: string
  discipleIds: string[]
  socialHistory: SocialHistoryEntry[]
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
  kind: '凡人家族' | '修仙家族' | '玩家家族'
  resources: number
  fame: number
  territory: string
  history: SocialHistoryEntry[]
}

export interface SectMembership { sectId: string; position: SectPosition; contribution: number; joinedYear: number }
export interface SocialHistoryEntry { id: string; year: number; text: string; type: 'sect' | 'family' | 'relationship' | 'world' }
export interface MasterDisciple { masterId: string; discipleId: string; relationship: number; startedYear: number; status: 'active' | 'betrayed' | 'missing' | 'ended' }

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
export interface Sect {
  id: string
  name: string
  type: SectType
  rank: number
  location: string
  members: number
  resources: number
  fame: number
  style: string
  power: number
  status: string
  techniqueIds: string[]
}
export type SectState = Sect
export interface NPC { id: string; name: string; ageMonths: number; lifespanMonths: number; realmIndex: number; alive: boolean; relationship: number }
export interface NPCCultivator {
  id: string
  name: string
  ageMonths: number
  lifespanMonths: number
  realmIndex: number
  cultivation: number
  spiritRoot: SpiritRoot
  path: CultivationPathId
  talents: string[]
  personality: string
  sectId?: string
  position?: SectPosition
  alive: boolean
  deathYear?: number
  generation: number
}
export interface Relationship { id: string; fromId: string; toId: string; type: RelationshipType; value: number; createdYear: number; note: string }
export interface SectRelation { id: string; fromSectId: string; toSectId: string; type: SectRelationType; value: number; updatedYear: number }
export interface TerritoryState { id: string; name: string; resourceType: '灵药' | '灵矿' | '火精' | '魂晶' | '妖兽材料'; abundance: number; reserves: number; controllerType: '无主' | '宗门' | '家族'; controllerId?: string }

export interface WorldState {
  seed: string
  continent: ContinentState
  currentYear: number
  currentMonth: number
  eraName: string
  worldEvents: WorldEvent[]
  sects: SectState[]
  npcs: NPC[]
  npcCultivators: NPCCultivator[]
  relationships: Relationship[]
  sectRelations: SectRelation[]
  territories: TerritoryState[]
  masterDisciples: MasterDisciple[]
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
  acquiredTalents: AcquiredTalentInstance[]
  fateTags: FateTag[]
  fatePaths: FatePathState[]
  lifeTimeline: LifeTimelineEntry[]
  importantEvents: LifeTimelineEntry[]
  evaluationScore: number
  evaluationTitle: string
  cultivationLogs: CultivationLog[]
  breakthroughHistory: BreakthroughRecord[]
  bodyRealm: BodyRealm
  eventRiskHistory: EventRiskRecord[]
  deathCause?: DeathCauseDetail
  dangerRecords: DangerRecord[]
  majorOpportunities: MajorOpportunityRecord[]
  inheritanceHistory: InheritanceRecord[]
  sectMembership?: SectMembership
  socialHistory: SocialHistoryEntry[]
  relationshipSummary: { friends: number; rivals: number; enemies: number; disciples: number }
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

export type EffectType = 'stones' | 'cultivation' | 'lifespan' | 'stat' | 'item' | 'death' | 'pathResource' | 'pathExperience' | 'unlockPath' | 'soulStability' | 'acquireRoot' | 'purifyRoot' | 'stabilizeRoot' | 'elementalGrowth' | 'acquiredTalent'
export interface EventEffect { type: EffectType; value?: number; stat?: StatKey; itemId?: string; pathId?: CultivationPathId; resource?: keyof PathResources; element?: SpiritElement; purity?: number; stability?: number; talentId?: string; source?: string; text: string }
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
export interface PendingLifeEvent { eventId: string }
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
  pendingLifeEvent: PendingLifeEvent | null
  currentAction: CurrentAction | null
}
