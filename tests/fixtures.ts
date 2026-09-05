import { createWorld } from '../src/core/world/world'
import { initialPathResources } from '../src/core/paths/paths'
import { initialReincarnation } from '../src/core/reincarnation/reincarnation'
import { CURRENT_SAVE_VERSION } from '../src/core/save/serialization'
import { originById } from '../src/data/origins'
import { createSpiritRoot } from '../src/data/spiritRoots'
import { createSpiritualAptitude } from '../src/core/aptitude/aptitude'
import { initialCultivationResources } from '../src/core/actions/actionEffects'
import { BodyRealm, CharacterState, type Descendant, type GameSave, type Player, type WorldState } from '../src/models'

export function worldFixture(overrides: Partial<WorldState> = {}): WorldState {
  const world = createWorld('TS-12345678')
  return { ...world, ...overrides }
}

export function playerFixture(overrides: Partial<Player> = {}): Player {
  const spiritRoot = createSpiritRoot(['水', '木'])
  const player: Player = {
    id: 'p', name: '沈砚', generation: 1, birthYear: 84, ageMonths: 240, lifespanMonths: 1200,
    realmIndex: 1, cultivation: 200, cultivationRequired: 255,
    spiritRoot,
    stats: { comprehension: 60, luck: 60, constitution: 50, soul: 50, charm: 50 },
    statPotential: { comprehension: 78, luck: 82, constitution: 86, soul: 76, charm: 78 }, statHistory: [], spiritStones: 0,
    inventory: [], talents: [], talentPoints: 5, origin: originById('farmer'), familyId: 'family-p',
    bloodline: { familyId: 'family-p', familyName: '沈氏', bloodlineLevel: 1, inheritedTraits: [] }, entryType: 'initial',
    alive: true, deathFinalized: false, achievements: [], timeline: [],
    secondaryPaths: [], pathProgress: [], pathResources: initialPathResources(), unlockedPaths: ['dao', 'sword', 'body'],
    lifespanFateModifier: 0, lifespanBonusMonths: 0,
    spiritualAptitude: createSpiritualAptitude(spiritRoot), acquiredTalents: [], knownTechniques: ['plain-breath'], techniqueProgress: [],
    nearDeathCount: 0, dangerousEventCount: 0, severeInjuryCount: 0, luckyOutcomeStreak: 0, rareEventCount: 0, lateMajorBreakthroughs: 0,
    lifeEventHistory: [], fateTags: [], fatePaths: [], lifeTimeline: [], importantEvents: [],
    cultivationLogs: [], resources: initialCultivationResources(), characterStates: [CharacterState.NORMAL], breakthroughHistory: [], breakthroughProgress: 0,
    bodyRealm: BodyRealm.SKIN, bodyTrainingProgress: 0,
    eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [], discipleIds: [], socialHistory: [],
  }
  return { ...player, ...overrides }
}

export function saveFixture(overrides: Partial<GameSave> = {}): GameSave {
  const now = '2026-01-01T00:00:00.000Z'
  const save: GameSave = {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: now, updatedAt: now,
    player: playerFixture(), world: worldFixture(), lifeRecords: [], reincarnation: initialReincarnation(),
    settings: { fortunateMode: true, autoSave: false, logLimit: 120 }, pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null, pendingLifeEvent: null, currentAction: null,
  }
  return { ...save, ...overrides }
}

export function descendantFixture(overrides: Partial<Descendant> = {}): Descendant {
  const descendant: Descendant = {
    id: 'child', name: '沈清河', parents: ['p'], generation: 2, birthYear: 110, ageMonths: 18 * 12,
    lifespanMonths: 1200, realmIndex: 1, cultivation: 0, spiritRoot: createSpiritRoot(['木', '水']),
    stats: { comprehension: 55, luck: 52, constitution: 58, soul: 51, charm: 54 },
    statPotential: { comprehension: 75, luck: 75, constitution: 82, soul: 76, charm: 76 }, talents: [],
    origin: originById('farmer'), bloodlineTags: [], familyId: 'family-p', alive: true, inventory: [], spiritStones: 0,
  }
  return { ...descendant, ...overrides }
}
