import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BODY_REALM_NAMES, CULTIVATION_ACTIONS } from '../src/core/actions/action'
import { addCharacterState, cultivationStateMultiplier, initialCultivationResources } from '../src/core/actions/actionEffects'
import { resolveCultivationAction } from '../src/core/actions/actionResolver'
import { calculateBreakthroughChance, checkBreakthroughRequirements } from '../src/core/breakthrough/breakthrough'
import { RandomService } from '../src/core/random/RandomService'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { REALMS } from '../src/data/realms'
import { BodyRealm, CharacterState, CultivationAction } from '../src/models'
import { useGameStore } from '../src/stores/game'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

describe('V3.3 annual cultivation actions', () => {
  it('defines all six selectable actions and their valid durations', () => {
    expect(CULTIVATION_ACTIONS.map((entry) => entry.id)).toEqual(Object.values(CultivationAction))
    expect(CULTIVATION_ACTIONS.find((entry) => entry.id === CultivationAction.MEDITATION)?.durationOptions).toEqual([1, 3, 5])
  })

  it('meditation advances cultivation, techniques and bottleneck preparation', () => {
    const player = playerFixture({ cultivation: 250, cultivationRequired: 255, activeTechnique: 'plain-breath' })
    const result = resolveCultivationAction(player, worldFixture(), CultivationAction.MEDITATION, new RandomService(() => .99), 3)
    expect(result.cultivationGain).toBeGreaterThan(0)
    expect(player.techniqueProgress[0].experience + player.techniqueProgress[0].level).toBeGreaterThan(1)
    expect(player.characterStates).toContain(CharacterState.BOTTLENECK)
    expect(player.breakthroughProgress).toBeGreaterThan(0)
    const bottleneck = playerFixture({ cultivation: 250, cultivationRequired: 255 })
    const bottleneckResult = resolveCultivationAction(bottleneck, worldFixture(), CultivationAction.MEDITATION, new RandomService(() => .99), 1, { forcedResult: 'ordinary' })
    expect(bottleneckResult.resultType).toBe('bottleneck')
  })

  it('can produce insight or inner demon outcomes during seclusion', () => {
    const insight = playerFixture()
    resolveCultivationAction(insight, worldFixture(), CultivationAction.MEDITATION, new RandomService(() => .5), 1, { forcedResult: 'insight' })
    expect(insight.characterStates).toContain(CharacterState.ENLIGHTENED)
    const troubled = playerFixture({ primaryPath: 'demonic' })
    resolveCultivationAction(troubled, worldFixture(), CultivationAction.MEDITATION, new RandomService(() => .5), 1, { forcedResult: 'inner-demon' })
    expect(troubled.characterStates).toContain(CharacterState.INNER_DEMON)
    expect(troubled.pathResources.innerDemon).toBeGreaterThan(0)
  })

  it('adventure rewards path-specific resources and uses world abundance', () => {
    const sparse = worldFixture(); sparse.continent.cultivationEnvironment.resourceMultiplier = .5
    const rich = worldFixture(); rich.continent.cultivationEnvironment.resourceMultiplier = 2
    const body = playerFixture({ primaryPath: 'body' })
    const ghost = playerFixture({ primaryPath: 'ghost', soulStability: 70 })
    const low = resolveCultivationAction(body, sparse, CultivationAction.ADVENTURE, new RandomService(() => .4), 1, { forcedResult: 'resource' })
    const high = resolveCultivationAction(ghost, rich, CultivationAction.ADVENTURE, new RandomService(() => .4), 1, { forcedResult: 'resource' })
    expect(body.resources.bodyMaterials).toBeGreaterThan(0)
    expect(ghost.resources.soulCrystals).toBeGreaterThan(0)
    expect(high.resourceGains.spiritHerbs).toBeGreaterThan(low.resourceGains.spiritHerbs ?? 0)
  })

  it('enlightenment grows five elements, sword intent and demonic understanding', () => {
    const five = playerFixture()
    five.spiritualAptitude.innateRoot.elements = ['金', '木', '水', '火', '土']
    const result = resolveCultivationAction(five, worldFixture(), CultivationAction.ENLIGHTENMENT, new RandomService(() => .5), 1)
    expect(five.spiritualAptitude.elementalGrowth.金).toBeGreaterThan(0)
    expect(result.fateTag?.id).toBe('FIVE_ELEMENT_INSIGHT')
    const sword = playerFixture({ primaryPath: 'sword' })
    resolveCultivationAction(sword, worldFixture(), CultivationAction.ENLIGHTENMENT, new RandomService(() => .5), 1)
    expect(sword.pathResources.swordIntent).toBeGreaterThan(0)
    const demonic = playerFixture({ primaryPath: 'demonic' })
    resolveCultivationAction(demonic, worldFixture(), CultivationAction.ENLIGHTENMENT, new RandomService(() => .5), 1)
    expect(demonic.pathResources.demonicNature).toBeGreaterThan(0)
  })

  it('body training consumes materials and advances the physical realm', () => {
    const player = playerFixture({ primaryPath: 'body', resources: { ...initialCultivationResources(), bodyMaterials: 3 }, bodyTrainingProgress: 90 })
    resolveCultivationAction(player, worldFixture(), CultivationAction.BODY_TRAINING, new RandomService(() => .99), 1)
    expect(player.resources.bodyMaterials).toBe(2)
    expect(player.bodyRealm).not.toBe(BodyRealm.SKIN)
    expect(BODY_REALM_NAMES[player.bodyRealm]).toBeTruthy()
  })

  it('travel creates causality hooks and recovery removes adverse states', () => {
    const traveler = playerFixture()
    const travel = resolveCultivationAction(traveler, worldFixture(), CultivationAction.TRAVEL, new RandomService(() => .4), 2)
    expect(travel.lifeEventChance).toBeGreaterThan(.5)
    expect(travel.fateTag?.id).toContain('TRAVEL_')
    const wounded = playerFixture({ characterStates: [CharacterState.SERIOUS_INJURY, CharacterState.INNER_DEMON], stats: { ...playerFixture().stats, soul: 80 } })
    resolveCultivationAction(wounded, worldFixture(), CultivationAction.RECOVERY, new RandomService(() => .5), 2)
    expect(wounded.characterStates).not.toContain(CharacterState.SERIOUS_INJURY)
    expect(wounded.characterStates).not.toContain(CharacterState.INNER_DEMON)
  })
})

describe('V3.3 states and breakthrough preparation', () => {
  it('states affect cultivation and breakthrough chance', () => {
    const normal = playerFixture()
    const impaired = playerFixture()
    addCharacterState(impaired, CharacterState.INNER_DEMON)
    expect(cultivationStateMultiplier(impaired)).toBeLessThan(cultivationStateMultiplier(normal))
    expect(calculateBreakthroughChance(impaired, worldFixture()).final).toBeLessThan(calculateBreakthroughChance(normal, worldFixture()).final)
  })

  it('requires cultivation, technique, resources, state and preparation', () => {
    const player = playerFixture({ realmIndex: 10, cultivation: REALMS[10].cultivationRequired, cultivationRequired: REALMS[10].cultivationRequired, activeTechnique: 'plain-breath', breakthroughProgress: 100 })
    player.techniqueProgress.push({ techniqueId: 'plain-breath', experience: 0, level: 3 })
    let check = checkBreakthroughRequirements(player)
    expect(check.ready).toBe(false)
    expect(check.missing).toContain('突破资源不足')
    player.resources = { ...check.resourceCost }
    check = checkBreakthroughRequirements(player)
    expect(check.ready).toBe(true)
    addCharacterState(player, CharacterState.SERIOUS_INJURY)
    expect(checkBreakthroughRequirements(player).stateReady).toBe(false)
  })
})

describe('V3.3 store loop and breakthroughs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('advances world and character age, writes a log, and clears current action', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    const year = game.state.world.currentYear; const age = game.player!.ageMonths
    const result = game.advanceYear(CultivationAction.MEDITATION, 1)
    expect(result?.action).toBe(CultivationAction.MEDITATION)
    expect(game.state.world.currentYear).toBe(year + 1)
    expect(game.player!.ageMonths).toBe(age + 12)
    expect(game.player!.cultivationLogs).toHaveLength(1)
    expect(game.state.currentAction).toBeNull()
  })

  it('records a successful major breakthrough and extends lifespan', () => {
    const player = playerFixture({ realmIndex: 10, cultivation: REALMS[10].cultivationRequired, cultivationRequired: REALMS[10].cultivationRequired, activeTechnique: 'plain-breath', breakthroughProgress: 100, lifespanMonths: 1200 })
    player.techniqueProgress = [{ techniqueId: 'plain-breath', experience: 0, level: 3 }]
    player.resources = { spiritHerbs: 2, beastCores: 1, bodyMaterials: 0, soulCrystals: 0 }
    const game = useGameStore(); game.replaceState(saveFixture({ player }))
    expect(game.breakthroughRequirements).toMatchObject({ ready: true })
    game.breakthrough(true)
    expect(game.player!.realmIndex).toBe(11)
    expect(game.player!.lifespanMonths).toBeGreaterThan(1200)
    expect(game.player!.breakthroughHistory[0].success).toBe(true)
    expect(game.player!.resources.spiritHerbs).toBe(0)
  })

  it('records failure, cultivation loss and injury', () => {
    const player = playerFixture({ cultivation: 255, cultivationRequired: 255, breakthroughProgress: 100 })
    const game = useGameStore(); game.replaceState(saveFixture({ player }))
    game.breakthrough(false)
    expect(game.player!.realmIndex).toBe(1)
    expect(game.player!.cultivation).toBeLessThan(255)
    expect(game.player!.breakthroughHistory[0].success).toBe(false)
    expect(game.player!.characterStates.some((entry) => entry === CharacterState.INJURED || entry === CharacterState.SERIOUS_INJURY)).toBe(true)
  })
})

describe('Save V8 cultivation migration and JSON', () => {
  it('migrates V7 saves with safe V3.3 defaults', () => {
    const save = saveFixture()
    const { cultivationLogs: _logs, resources: _resources, characterStates: _states, breakthroughHistory: _history, breakthroughProgress: _progress, bodyRealm: _bodyRealm, bodyTrainingProgress: _bodyProgress, ...legacyPlayer } = save.player!
    const migrated = migrateSave({ ...save, version: 7, currentAction: undefined, player: legacyPlayer })
    expect(migrated.version).toBe(8)
    expect(migrated.currentAction).toBeNull()
    expect(migrated.player).toMatchObject({ cultivationLogs: [], resources: initialCultivationResources(), characterStates: [CharacterState.NORMAL], breakthroughHistory: [], breakthroughProgress: 0, bodyRealm: BodyRealm.SKIN, bodyTrainingProgress: 0 })
  })

  it('round-trips actions, resources, states, logs and breakthrough history', () => {
    const save = saveFixture({ currentAction: { action: CultivationAction.MEDITATION, startedYear: 120, durationYears: 3 } })
    save.player!.resources.spiritHerbs = 7
    save.player!.characterStates = [CharacterState.BOTTLENECK]
    save.player!.cultivationLogs.push({ id: 'log', year: 120, month: 1, action: CultivationAction.MEDITATION, years: 3, title: '静室修行', summary: '修为增长。', cultivationGain: 300, techniqueExperience: 20, resultType: 'ordinary' })
    save.player!.breakthroughHistory.push({ id: 'break', year: 120, month: 1, fromRealm: '凡人', toRealm: '炼气 1层', success: true, chance: .8, result: '成功', lifespanBefore: 1200, lifespanAfter: 1800 })
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(8)
    expect(restored.currentAction?.action).toBe(CultivationAction.MEDITATION)
    expect(restored.player!.resources.spiritHerbs).toBe(7)
    expect(restored.player!.characterStates).toEqual([CharacterState.BOTTLENECK])
    expect(restored.player!.cultivationLogs[0].id).toBe('log')
    expect(restored.player!.breakthroughHistory[0].success).toBe(true)
  })
})
