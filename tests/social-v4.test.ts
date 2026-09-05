import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { promoteCultivationFamily, inheritFamilyLegacy } from '../src/core/family/family'
import { generateNPCCultivator, generateSectCohort, simulateNPCCultivator } from '../src/core/npc/npcCultivator'
import { relationshipSummary, setRelationship } from '../src/core/relationships/relationship'
import { RandomService, createSeededRandom } from '../src/core/random/RandomService'
import { initialSectRelations, changeSectRelation } from '../src/core/sect/sectRelation'
import { addSectContribution, canJoinSect, createSect, generateSects, joinSect, techniqueContributionCost } from '../src/core/sect/sectManager'
import { sectPositionForRealm, sectRankName } from '../src/core/sect/sect'
import { generateTerritories, simulateTerritories } from '../src/core/world/territories'
import { createWorld, simulateWorld } from '../src/core/world/world'
import { LIFE_EVENTS } from '../src/data/lifeEvents'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { createLifeRecord } from '../src/core/reincarnation/reincarnation'
import { useGameStore } from '../src/stores/game'
import type { Relationship } from '../src/models'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

describe('V4 sects and faction relations', () => {
  it('creates all eight sect archetypes with rank, location, resources and techniques', () => {
    const sects = generateSects('V4-SECT-SEED')
    expect(sects).toHaveLength(8)
    expect(new Set(sects.map((sect) => sect.type)).size).toBe(8)
    expect(sects.every((sect) => sect.rank >= 0 && sect.rank <= 4 && sect.members > 0 && sect.resources > 0 && sect.techniqueIds.length > 0)).toBe(true)
    expect(sectRankName(4)).toBe('顶级圣地')
  })

  it('gates joining and assigns positions from mortal servant through elder', () => {
    const rng = createSeededRandom('JOIN')
    const small = createSect('small', '青石门', '散修联盟', 1, '青石城', rng)
    const sacred = createSect('sacred', '太上圣地', '剑宗', 4, '天外峰', rng)
    const mortal = playerFixture({ realmIndex: 0 })
    expect(canJoinSect(mortal, small)).toBe(true)
    expect(canJoinSect(mortal, sacred)).toBe(false)
    expect(joinSect(mortal, small, 120)).toMatchObject({ position: '杂役弟子', contribution: 0 })
    expect(sectPositionForRealm(1)).toBe('外门弟子')
    expect(sectPositionForRealm(11)).toBe('内门弟子')
    expect(sectPositionForRealm(19)).toBe('长老')
  })

  it('promotes identity with contribution and changes faction diplomacy', () => {
    const player = playerFixture({ realmIndex: 11, sectMembership: { sectId: 'a', position: '内门弟子', contribution: 0, joinedYear: 100 } })
    addSectContribution(player, 500)
    expect(player.sectMembership?.position).toBe('真传弟子')
    const sects = generateSects('RELATIONS')
    const relations = initialSectRelations(sects, 100)
    const first = relations[0]
    changeSectRelation(first, -100, 120)
    expect(first).toMatchObject({ type: '敌对', updatedYear: 120 })
  })
})

describe('V4 families, territories and resource flow', () => {
  it('creates a player cultivation family and exposes inheritable legacy', () => {
    const player = playerFixture({ realmIndex: 11, spiritStones: 1000 })
    const family = worldFixture().families[0] ?? { id: player.familyId, name: '沈氏', founderId: player.id, foundedYear: 100, wealth: 400, inventory: [], reputation: 10, bloodline: player.bloodline, memberIds: [player.id], kind: '凡人家族' as const, resources: 0, fame: 0, territory: '故乡村镇', history: [] }
    const territory = { id: 'land', name: '青云山', resourceType: '灵药' as const, abundance: 80, reserves: 1000, controllerType: '无主' as const }
    promoteCultivationFamily(family, player, '沈氏仙族', 150, territory)
    expect(family).toMatchObject({ name: '沈氏仙族', kind: '玩家家族', territory: '青云山' })
    expect(inheritFamilyLegacy(family).spiritStones).toBeGreaterThan(0)
    expect(family.history[0].text).toContain('建立')
  })

  it('moves regional resources into the controlling sect over time', () => {
    const sects = generateSects('TERRITORY')
    const territories = generateTerritories(sects, createSeededRandom('TERRITORY'))
    const before = sects[0].resources; const reserves = territories[0].reserves
    simulateTerritories(territories, sects, 120, new RandomService(() => .5))
    expect(sects[0].resources).toBeGreaterThan(before)
    expect(territories[0].reserves).toBeLessThan(reserves)
  })
})

describe('V4 NPC cultivation and relationships', () => {
  it('generates a 10–30 member cohort with roots, paths, personalities and sect identities', () => {
    const rng = createSeededRandom('COHORT')
    const sect = generateSects('COHORT')[0]
    const cohort = generateSectCohort(rng, 100, sect)
    expect(cohort.length).toBeGreaterThanOrEqual(10)
    expect(cohort.length).toBeLessThanOrEqual(30)
    expect(cohort.every((npc) => npc.sectId === sect.id && npc.spiritRoot.elements.length > 0 && npc.path && npc.personality)).toBe(true)
  })

  it('lets NPCs cultivate, break through and eventually die', () => {
    const rng = new RandomService(() => 0)
    const npc = generateNPCCultivator(rng, 100, undefined, 1)
    npc.cultivation = 1_000_000
    simulateNPCCultivator(npc, 12, 101, rng)
    expect(npc.realmIndex).toBeGreaterThan(1)
    npc.ageMonths = npc.lifespanMonths - 12
    simulateNPCCultivator(npc, 12, 102, rng)
    expect(npc).toMatchObject({ alive: false, deathYear: 102 })
  })

  it('records friends, rivals, enemies and master-disciple ties', () => {
    const relationships: Relationship[] = []
    setRelationship(relationships, 'player', 'friend', '好友', 60, 100)
    setRelationship(relationships, 'player', 'rival', '竞争', 35, 100)
    setRelationship(relationships, 'player', 'enemy', '仇恨', -80, 100)
    setRelationship(relationships, 'player', 'disciple', '师徒', 50, 100)
    expect(relationshipSummary(relationships, 'player')).toEqual({ friends: 1, rivals: 1, enemies: 1, disciples: 1 })
  })

  it('preserves sect identity and relationship totals in the final chronicle', () => {
    const player = playerFixture({ sectMembership: { sectId: 'sect', position: '长老', contribution: 880, joinedYear: 120 } })
    player.socialHistory.push({ id: 'joined', year: 120, text: '加入宗门', type: 'sect' })
    const relationships: Relationship[] = []
    setRelationship(relationships, player.id, 'friend', '好友', 50, 120)
    setRelationship(relationships, player.id, 'enemy', '敌对', -50, 130)
    const record = createLifeRecord(player, 200, '金丹', 60, relationships)
    expect(record.sectMembership).toEqual(player.sectMembership)
    expect(record.socialHistory).toEqual(player.socialHistory)
    expect(record.relationshipSummary).toMatchObject({ friends: 1, enemies: 1 })
  })

  it('advances NPC age through the existing world simulation', () => {
    const world = createWorld('NPC-WORLD')
    const before = world.npcCultivators[0].ageMonths
    simulateWorld(world, 24, new RandomService(() => .5))
    expect(world.npcCultivators[0].ageMonths).toBe(before + 24)
  })
})

describe('V4 store society loop and social events', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('joins a sect, generates peers, creates initial relationships and writes the chronicle', () => {
    const player = playerFixture({ realmIndex: 5 })
    const game = useGameStore(); game.replaceState(saveFixture({ player }))
    const sect = game.state.world.sects.find((entry) => canJoinSect(game.player!, entry))!
    const before = game.state.world.npcCultivators.length
    expect(game.joinPlayerSect(sect.id)).toBe(true)
    expect(game.player!.sectMembership?.sectId).toBe(sect.id)
    expect(game.state.world.npcCultivators.length - before).toBeGreaterThanOrEqual(10)
    expect(game.state.world.relationships.some((entry) => entry.fromId === player.id)).toBe(true)
    expect(game.player!.importantEvents.some((entry) => entry.text.includes('加入'))).toBe(true)
  })

  it('supports contributions, technique exchange, master selection and family founding', () => {
    const player = playerFixture({ realmIndex: 11, spiritStones: 2000 })
    const game = useGameStore(); game.replaceState(saveFixture({ player }))
    const sect = game.state.world.sects.find((entry) => canJoinSect(game.player!, entry))!
    game.joinPlayerSect(sect.id)
    expect(game.donateSectResources(1000)).toBe(true)
    const techniqueId = game.currentSect!.techniqueIds.find((id) => !game.player!.knownTechniques.includes(id))!
    expect(game.player!.sectMembership!.contribution).toBeGreaterThanOrEqual(techniqueContributionCost(techniqueId))
    expect(game.exchangeSectTechnique(techniqueId)).toBe(true)
    expect(game.player!.knownTechniques).toContain(techniqueId)
    const master = generateNPCCultivator(createSeededRandom('MASTER'), game.state.world.currentYear, game.currentSect!, 20)
    game.state.world.npcCultivators.push(master)
    expect(game.chooseMaster(master.id)).toBe(true)
    expect(game.state.world.masterDisciples[0]).toMatchObject({ masterId: master.id, discipleId: game.player!.id })
    expect(game.establishCultivationFamily('沈氏仙族')).toBe(true)
    expect(game.state.world.families.find((entry) => entry.id === game.player!.familyId)?.kind).toBe('玩家家族')
  })

  it('adds sect, family, master, peer, friendship and territory events to the existing pool', () => {
    const ids = LIFE_EVENTS.map((entry) => entry.id)
    expect(ids).toEqual(expect.arrayContaining(['sect-war', 'family-crisis-social', 'master-missing', 'peer-challenge', 'friend-breakthrough-aid', 'territory-dispute']))
  })
})

describe('Save V11 migration and JSON', () => {
  it('migrates a V10 world and player without type assertions masking missing fields', () => {
    const legacy = saveFixture({ version: 10 })
    const player = { ...legacy.player } as Record<string, unknown>
    delete player.sectMembership; delete player.masterId; delete player.discipleIds; delete player.socialHistory
    const { npcCultivators: _npcs, relationships: _relationships, sectRelations: _relations, territories: _territories, masterDisciples: _masters, ...oldWorld } = legacy.world
    oldWorld.sects = oldWorld.sects.map(({ id, name, power, status }) => ({ id, name, power, status })) as typeof oldWorld.sects
    oldWorld.families = oldWorld.families.map(({ kind: _kind, resources: _resources, fame: _fame, territory: _territory, history: _history, ...family }) => family) as typeof oldWorld.families
    const migrated = migrateSave({ ...legacy, version: 10, player, world: oldWorld })
    expect(migrated.version).toBe(11)
    expect(migrated.player).toMatchObject({ discipleIds: [], socialHistory: [] })
    expect(migrated.world.sects.every((sect) => sect.type && sect.location && Array.isArray(sect.techniqueIds))).toBe(true)
    expect(migrated.world.sectRelations.length).toBeGreaterThan(0)
    expect(migrated.world.territories.length).toBeGreaterThan(0)
    expect(migrated.world.npcCultivators.length).toBeGreaterThan(0)
    expect(migrated.world.sectRelations.every((relation) => migrated.world.sects.some((sect) => sect.id === relation.fromSectId) && migrated.world.sects.some((sect) => sect.id === relation.toSectId))).toBe(true)
  })

  it('round-trips social identity, NPCs, relationships, factions and territories', () => {
    const save = saveFixture()
    save.player!.sectMembership = { sectId: save.world.sects[0].id, position: '内门弟子', contribution: 320, joinedYear: 120 }
    save.player!.socialHistory.push({ id: 'social', year: 120, text: '加入山门', type: 'sect' })
    setRelationship(save.world.relationships, save.player!.id, save.world.npcCultivators[0].id, '好友', 55, 120)
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(11)
    expect(restored.player!.sectMembership).toEqual(save.player!.sectMembership)
    expect(restored.player!.socialHistory).toEqual(save.player!.socialHistory)
    expect(restored.world.npcCultivators).toEqual(save.world.npcCultivators)
    expect(restored.world.relationships).toEqual(save.world.relationships)
    expect(restored.world.sectRelations).toEqual(save.world.sectRelations)
    expect(restored.world.territories).toEqual(save.world.territories)
  })
})
