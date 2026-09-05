import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LIFE_EVENTS } from '../src/data/lifeEvents'
import { createSpiritRoot } from '../src/data/spiritRoots'
import { createSpiritualAptitude } from '../src/core/aptitude/aptitude'
import { determineLifeStage, meetsEventCondition } from '../src/core/lifeEvents/eventCondition'
import { calculateLifeEventWeight, checkLifeEvents, isLifeEventOnCooldown, selectLifeEvent } from '../src/core/lifeEvents/eventResolver'
import { resolveLifeEventChoice } from '../src/core/lifeEvents/eventOutcome'
import { addFateTag, addLifeTimelineEntry, createLifeTimelineEntry, importantLifeEvents, recordLifeEvent, removeFateTag } from '../src/core/lifeEvents/eventHistory'
import { completedFateEvaluation, evaluateFatePaths } from '../src/core/lifeEvents/fatePath'
import { createLifeRecord } from '../src/core/reincarnation/reincarnation'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { RandomService } from '../src/core/random/RandomService'
import { useGameStore } from '../src/stores/game'
import { LifeStage, type LifeEventRecord, type LifeTimelineEntry } from '../src/models'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

const event = (id: string) => LIFE_EVENTS.find((entry) => entry.id === id)!
const history = (eventId: string, year: number, tags: string[] = []): LifeEventRecord => ({ eventId, eventName: eventId, year, month: 1, age: 20, choice: 'engage', choiceLabel: '主动介入', result: '已完成', importance: 3, tags })

describe('V3.2 life event catalog and stages', () => {
  it('defines forty choice-driven events in the requested stage groups', () => {
    expect(LIFE_EVENTS.length).toBeGreaterThanOrEqual(51)
    expect(LIFE_EVENTS.filter((entry) => entry.stage === LifeStage.MORTAL).length).toBeGreaterThanOrEqual(10)
    expect(LIFE_EVENTS.filter((entry) => entry.stage === LifeStage.EARLY_CULTIVATION).length).toBeGreaterThanOrEqual(15)
    expect(LIFE_EVENTS.filter((entry) => ![LifeStage.MORTAL, LifeStage.EARLY_CULTIVATION].includes(entry.stage)).length).toBeGreaterThanOrEqual(15)
    expect(LIFE_EVENTS.every((entry) => entry.choices.length >= 3 && entry.cooldown > 0 && entry.weight > 0)).toBe(true)
  })

  it('derives childhood, teenage, mortal, early, mid, late and old-age stages', () => {
    expect(determineLifeStage(playerFixture({ ageMonths: 8 * 12, realmIndex: 0 }))).toBe(LifeStage.CHILDHOOD)
    expect(determineLifeStage(playerFixture({ ageMonths: 15 * 12, realmIndex: 0 }))).toBe(LifeStage.TEENAGE)
    expect(determineLifeStage(playerFixture({ ageMonths: 20 * 12, realmIndex: 0 }))).toBe(LifeStage.MORTAL)
    expect(determineLifeStage(playerFixture({ ageMonths: 20 * 12, realmIndex: 5 }))).toBe(LifeStage.EARLY_CULTIVATION)
    expect(determineLifeStage(playerFixture({ ageMonths: 20 * 12, realmIndex: 18 }))).toBe(LifeStage.MID_CULTIVATION)
    expect(determineLifeStage(playerFixture({ ageMonths: 20 * 12, realmIndex: 30 }))).toBe(LifeStage.LATE_CULTIVATION)
    expect(determineLifeStage(playerFixture({ ageMonths: 90 * 12, lifespanMonths: 100 * 12, realmIndex: 30 }))).toBe(LifeStage.OLD_AGE)
  })
})

describe('V3.2 conditions, weighting and cooldown', () => {
  it('evaluates age, realm, path, root, talent, history, fate and world conditions', () => {
    const world = worldFixture()
    const player = playerFixture({ primaryPath: 'sword', ageMonths: 30 * 12, realmIndex: 12 })
    player.fateTags.push({ id: 'PROMISE', name: '旧约', description: '', createdAt: 100 })
    player.lifeEventHistory.push(history('past', 100, ['danger']))
    player.talents.push({ id: 'longevity', name: '长寿', description: '', quality: '普通', cost: 1, effects: [], firstGenerationAvailable: true, acquiredGeneration: 1 })
    expect(meetsEventCondition({ type: 'MIN_AGE', value: 20 }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'MAX_AGE', value: 20 }, player, world)).toBe(false)
    expect(meetsEventCondition({ type: 'MIN_REALM', value: 10 }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'PATH', value: 'sword' }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'ROOT_ELEMENT', value: '水' }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'TALENT', value: 'longevity' }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'FATE_TAG', value: 'PROMISE' }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'HISTORY_TAG', value: 'danger' }, player, world)).toBe(true)
    expect(meetsEventCondition({ type: 'WORLD_TRAIT', value: world.continent.traits[0].id }, player, world)).toBe(true)
  })

  it('filters conditional follow-ups until their causal tag exists', () => {
    const world = worldFixture()
    const player = playerFixture({ realmIndex: 2, ageMonths: 25 * 12 })
    expect(checkLifeEvents(LIFE_EVENTS, player, world).some((entry) => entry.event.id === 'elder-return')).toBe(false)
    player.fateTags.push({ id: 'SAVED_ELDER', name: '救命之恩', description: '', createdAt: world.currentYear })
    expect(checkLifeEvents(LIFE_EVENTS, player, world).some((entry) => entry.event.id === 'elder-return')).toBe(true)
  })

  it('raises weight from luck, matching paths and an already formed fate path', () => {
    const world = worldFixture()
    const swordEvent = event('sword-at-cliff')
    const base = playerFixture({ realmIndex: 3, ageMonths: 25 * 12, stats: { ...playerFixture().stats, luck: 20 } })
    const favored = playerFixture({ realmIndex: 3, ageMonths: 25 * 12, primaryPath: 'sword', stats: { ...playerFixture().stats, luck: 100 } })
    favored.fatePaths.push({ id: 'sword-legend', name: '剑道传奇', description: '', progress: 100, status: 'completed', milestones: [], evaluation: 100 })
    expect(calculateLifeEventWeight(swordEvent, favored, world)).toBeGreaterThan(calculateLifeEventWeight(swordEvent, base, world))
  })

  it('enforces cooldown and selects from weighted pools deterministically', () => {
    const world = worldFixture({ currentYear: 150 })
    const player = playerFixture({ realmIndex: 0, ageMonths: 25 * 12 })
    const elder = event('mountain-elder')
    player.lifeEventHistory.push(history(elder.id, 145))
    expect(isLifeEventOnCooldown(elder, player, world.currentYear)).toBe(true)
    expect(checkLifeEvents(LIFE_EVENTS, player, world).some((entry) => entry.event.id === elder.id)).toBe(false)
    player.lifeEventHistory[0].year = 120
    const pool = checkLifeEvents(LIFE_EVENTS, player, world)
    expect(selectLifeEvent(pool, new RandomService(() => 0))).toBe(pool[0].event)
  })
})

describe('V3.2 choices, causality and event history', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('resolves a choice into a complete history record', () => {
    const player = playerFixture({ ageMonths: 33 * 12 })
    const world = worldFixture({ currentYear: 133, currentMonth: 7 })
    const resolved = resolveLifeEventChoice(event('mountain-elder'), 'save', player, world)!
    expect(resolved.record).toMatchObject({ eventId: 'mountain-elder', year: 133, month: 7, age: 33, choice: 'save', importance: 3 })
  })

  it('applies a store choice, modifies stats, saves causality and supports cancellation only through choices', () => {
    const game = useGameStore()
    game.replaceState(saveFixture({ player: playerFixture({ realmIndex: 0, ageMonths: 25 * 12 }) }))
    const charm = game.player!.stats.charm
    expect(game.triggerLifeEvent('mountain-elder')).toBe(true)
    expect(game.chooseLifeEvent('save')).toBe(true)
    expect(game.player!.stats.charm).toBe(charm + 2)
    expect(game.player!.fateTags.some((tag) => tag.id === 'SAVED_ELDER')).toBe(true)
    expect(game.player!.lifeEventHistory[game.player!.lifeEventHistory.length - 1]).toMatchObject({ eventId: 'mountain-elder', choice: 'save' })
    expect(game.pendingLifeEvent).toBeUndefined()
  })

  it('adds and removes unique fate tags', () => {
    const player = playerFixture()
    const tag = { id: 'A', name: '一念', description: '一段因果', createdAt: 100 }
    expect(addFateTag(player, tag)).toBe(true)
    expect(addFateTag(player, tag)).toBe(false)
    expect(removeFateTag(player, 'A')).toBe(true)
    expect(removeFateTag(player, 'A')).toBe(false)
  })

  it('keeps all event records but admits only importance three or four into important events', () => {
    const player = playerFixture()
    recordLifeEvent(player, history('ordinary', 100))
    const ordinary = createLifeTimelineEntry(player, 100, 1, '寻常修炼', 'event', 2)
    const legendary = createLifeTimelineEntry(player, 120, 3, '获得大能传承', 'inheritance', 4)
    addLifeTimelineEntry(player, ordinary)
    addLifeTimelineEntry(player, legendary)
    expect(player.lifeEventHistory).toHaveLength(1)
    expect(player.lifeTimeline).toHaveLength(2)
    expect(player.importantEvents).toEqual([legendary])
    expect(importantLifeEvents(player.lifeTimeline)).toEqual([legendary])
  })
})

describe('V3.2 fate paths and chronicle evaluation', () => {
  it('generates all five fate paths and completes sword legend from its real conditions', () => {
    const player = playerFixture({ primaryPath: 'sword' })
    player.pathResources.swordIntent = 100
    player.pathProgress.push({ pathId: 'sword', experience: 900, level: 9 })
    for (let i = 0; i < 5; i++) player.lifeEventHistory.push(history(`sword-${i}`, 100 + i, ['sword']))
    const completed = evaluateFatePaths(player, 150)
    expect(player.fatePaths).toHaveLength(5)
    expect(completed.map((path) => path.id)).toContain('sword-legend')
    expect(player.fatePaths.find((path) => path.id === 'sword-legend')).toMatchObject({ progress: 100, status: 'completed', evaluation: 100 })
  })

  it('completes five-elements and defy-destiny without granting raw stat rewards', () => {
    const root = createSpiritRoot(['金', '木', '水', '火', '土'])
    const player = playerFixture({ spiritRoot: root, spiritualAptitude: createSpiritualAptitude(root), nearDeathCount: 5 })
    player.acquiredTalents.push({ talentId: 'five-unity', name: '五行归一', acquiredYear: 120, acquiredMonth: 1, source: '顿悟' })
    player.acquiredTalents.push({ talentId: 'defy-fate', name: '逆天改命', acquiredYear: 130, acquiredMonth: 1, source: '破境' })
    for (let i = 0; i < 3; i++) player.lifeEventHistory.push(history(`five-${i}`, 110 + i, ['five-elements']))
    const statsBefore = { ...player.stats }
    evaluateFatePaths(player, 150)
    expect(player.fatePaths.find((path) => path.id === 'five-elements-dao')?.status).toBe('completed')
    expect(player.fatePaths.find((path) => path.id === 'defy-destiny')?.status).toBe('completed')
    expect(player.stats).toEqual(statsBefore)
    expect(completedFateEvaluation(player)).toBeGreaterThanOrEqual(170)
  })

  it('forms demonic-overlord and longevity-road from their distinct conditions', () => {
    const demonic = playerFixture({ primaryPath: 'demonic', realmIndex: 25 })
    demonic.pathResources.demonicNature = 100
    for (let i = 0; i < 5; i++) demonic.lifeEventHistory.push(history(`demon-${i}`, 100 + i, ['demonic']))
    evaluateFatePaths(demonic, 150)
    expect(demonic.fatePaths.find((path) => path.id === 'demonic-overlord')?.status).toBe('completed')

    const longevity = playerFixture({ ageMonths: 350 * 12, lifespanMonths: 1000 * 12, realmIndex: 20 })
    longevity.knownTechniques.push('water-wood-life')
    for (let i = 0; i < 5; i++) longevity.lifeEventHistory.push(history(`long-${i}`, 100 + i, ['longevity']))
    evaluateFatePaths(longevity, 450)
    expect(longevity.fatePaths.find((path) => path.id === 'longevity-road')?.status).toBe('completed')
  })

  it('copies the life timeline, fate titles and evaluation into the permanent chronicle', () => {
    const player = playerFixture()
    const entry: LifeTimelineEntry = { id: 'death', year: 200, month: 1, age: 100, text: '寿元耗尽，坐化。', type: 'death', importance: 4 }
    player.lifeTimeline.push(entry); player.importantEvents.push(entry)
    player.fatePaths.push({ id: 'longevity-road', name: '长生之路', description: '', progress: 100, status: 'completed', milestones: ['百年修行'], evaluation: 70, completedYear: 190 })
    const record = createLifeRecord(player, 200, '筑基', 30)
    expect(record.lifeTimeline).toEqual([entry])
    expect(record.importantEvents).toEqual([entry])
    expect(record.fatePaths[0].name).toBe('长生之路')
    expect(record.evaluationScore).toBeGreaterThanOrEqual(70)
    expect(record.evaluationTitle).not.toBe('')
  })
})

describe('V3.2 life-state migration and JSON recovery', () => {
  it('migrates a V6 player to the current version with empty V3.2 arrays', () => {
    const save = saveFixture()
    const { lifeEventHistory: _history, fateTags: _tags, fatePaths: _paths, lifeTimeline: _timeline, importantEvents: _important, ...legacyPlayer } = save.player!
    const migrated = migrateSave({ ...save, version: 6, player: legacyPlayer, pendingLifeEvent: undefined })
    expect(migrated.version).toBe(11)
    expect(migrated.pendingLifeEvent).toBeNull()
    expect(migrated.player).toMatchObject({ lifeEventHistory: [], fateTags: [], fatePaths: [], lifeTimeline: [], importantEvents: [] })
  })

  it('round-trips life history, pending choices, fate and timeline through JSON', () => {
    const save = saveFixture({ pendingLifeEvent: { eventId: 'mountain-elder' } })
    save.player!.lifeEventHistory.push(history('mountain-elder', 120, ['elder']))
    save.player!.fateTags.push({ id: 'SAVED_ELDER', name: '救命之恩', description: '老人记住了你。', createdAt: 120 })
    save.player!.fatePaths.push({ id: 'sword-legend', name: '剑道传奇', description: '', progress: 40, status: 'forming', milestones: ['以剑修为主道'], evaluation: 100 })
    const entry = createLifeTimelineEntry(save.player!, 120, 2, '救下一位老人。', 'event', 3)
    addLifeTimelineEntry(save.player!, entry)
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(11)
    expect(restored.pendingLifeEvent).toEqual({ eventId: 'mountain-elder' })
    expect(restored.player!.lifeEventHistory).toEqual(save.player!.lifeEventHistory)
    expect(restored.player!.fateTags).toEqual(save.player!.fateTags)
    expect(restored.player!.fatePaths).toEqual(save.player!.fatePaths)
    expect(restored.player!.importantEvents).toEqual([entry])
  })
})
