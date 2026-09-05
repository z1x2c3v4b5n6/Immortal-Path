import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { checkLifeEvents } from '../src/core/lifeEvents/eventResolver'
import { calculateEventRisk, calculateRewardLevel, eventDeathCategory, opportunityWeightMultiplier, resolveEventRisk, riskLevelName, riskStars } from '../src/core/lifeEvents/eventRisk'
import { RandomService } from '../src/core/random/RandomService'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { LIFE_EVENTS } from '../src/data/lifeEvents'
import { useGameStore } from '../src/stores/game'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

const event = (id: string) => LIFE_EVENTS.find((entry) => entry.id === id)!

describe('V3.5 risk and reward model', () => {
  it('assigns risk, reward and danger metadata to every event', () => {
    expect(LIFE_EVENTS.length).toBeGreaterThanOrEqual(51)
    expect(LIFE_EVENTS.every((entry) => entry.riskLevel >= 0 && entry.riskLevel <= 4)).toBe(true)
    expect(LIFE_EVENTS.every((entry) => entry.rewardLevel >= 1 && entry.rewardLevel <= 4 && Array.isArray(entry.dangerTags))).toBe(true)
    expect(riskLevelName(4)).toBe('九死一生')
    expect(riskStars(3)).toBe('★★★☆☆')
  })

  it('makes safe events nonlethal and high-risk events materially more dangerous', () => {
    const player = playerFixture({ realmIndex: 12 })
    const world = worldFixture()
    const safe = calculateEventRisk(event('elder-identity-revealed'), player, world, event('elder-identity-revealed').choices[0])
    const danger = calculateEventRisk(event('ancient-cultivator-cave'), player, world, event('ancient-cultivator-cave').choices[0])
    expect(safe.deathChance).toBe(0)
    expect(danger.deathChance).toBeGreaterThan(0)
    expect(danger.severeInjuryChance).toBeGreaterThan(safe.severeInjuryChance)
  })

  it('lets high luck find better opportunities and more survival turns without granting immunity', () => {
    const high = playerFixture({ stats: { ...playerFixture().stats, luck: 95, charm: 85 } })
    const low = playerFixture({ stats: { ...playerFixture().stats, luck: 10, charm: 30 } })
    const cave = event('ancient-cultivator-cave')
    expect(calculateRewardLevel(cave, high)).toBeGreaterThan(calculateRewardLevel(cave, low))
    expect(opportunityWeightMultiplier(cave, high)).toBeGreaterThan(opportunityWeightMultiplier(cave, low))
    const highRisk = calculateEventRisk(cave, high, worldFixture(), cave.choices[0])
    const lowRisk = calculateEventRisk(cave, low, worldFixture(), cave.choices[0])
    expect(highRisk.turningPointChance).toBeGreaterThan(lowRisk.turningPointChance)
    expect(highRisk.deathChance).toBeGreaterThan(0)
    expect(highRisk.deathChance).toBeLessThan(lowRisk.deathChance)
  })

  it('resolves deterministic death, injury and turning-point branches', () => {
    const assessment = calculateEventRisk(event('ancient-cultivator-cave'), playerFixture(), worldFixture(), event('ancient-cultivator-cave').choices[0])
    expect(resolveEventRisk({ ...assessment, deathChance: 1 }, new RandomService(() => 0))).toBe('death')
    expect(resolveEventRisk({ ...assessment, deathChance: 0, turningPointChance: 1 }, new RandomService(() => 0))).toBe('turning-point')
    expect(resolveEventRisk({ ...assessment, deathChance: 0, turningPointChance: 0, severeInjuryChance: 1 }, new RandomService(() => 0))).toBe('severe-injury')
  })
})

describe('V3.5 opportunities, inheritances and causal chains', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('contains the requested cave, inheritance, mysterious elder and path opportunities', () => {
    const ids = LIFE_EVENTS.map((entry) => entry.id)
    expect(ids).toEqual(expect.arrayContaining(['ancient-cultivator-cave', 'ancient-stele-inheritance', 'hidden-master', 'sword-tomb', 'five-element-monument', 'demonic-ruins', 'ghost-cultivator-tomb', 'rogue-cultivator-ambush', 'ancient-beast-attack']))
  })

  it('unlocks positive and negative follow-ups only after their fate tags exist', () => {
    const player = playerFixture({ realmIndex: 18, ageMonths: 100 * 12, lifespanMonths: 1000 * 12 })
    const world = worldFixture()
    expect(checkLifeEvents(LIFE_EVENTS, player, world).some((entry) => entry.event.id === 'elder-identity-revealed')).toBe(false)
    expect(checkLifeEvents(LIFE_EVENTS, player, world).some((entry) => entry.event.id === 'sect-vengeance')).toBe(false)
    player.fateTags.push({ id: 'SAVED_ELDER', name: '救命之恩', description: '', createdAt: 100 })
    player.fateTags.push({ id: 'KILLED_DISCIPLE', name: '杀徒之仇', description: '', createdAt: 100 })
    const ids = checkLifeEvents(LIFE_EVENTS, player, world).map((entry) => entry.event.id)
    expect(ids).toContain('elder-identity-revealed')
    expect(ids).toContain('sect-vengeance')
  })

  it('awards and records a technique inheritance', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    expect(game.triggerLifeEvent('ancient-stele-inheritance')).toBe(true)
    expect(game.chooseLifeEvent('inherit', 'safe')).toBe(true)
    expect(game.player!.knownTechniques).toContain('light-vow')
    expect(game.player!.inheritanceHistory[0]).toMatchObject({ eventId: 'ancient-stele-inheritance', name: '大光明净世法' })
    expect(game.player!.importantEvents.some((entry) => entry.type === 'inheritance')).toBe(true)
  })

  it('records a high-risk turning point as a major opportunity', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.triggerLifeEvent('ancient-cultivator-cave')
    game.chooseLifeEvent('enter', 'turning-point')
    expect(game.player!.alive).toBe(true)
    expect(game.player!.majorOpportunities[0]).toMatchObject({ eventId: 'ancient-cultivator-cave', rewardLevel: 4 })
    expect(game.player!.resources.spiritHerbs).toBeGreaterThan(0)
  })

  it('lets greed in a warned cave cause death and preserves its cause in the chronicle', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.triggerLifeEvent('ancient-cultivator-cave')
    game.chooseLifeEvent('enter', 'death')
    expect(game.player!.alive).toBe(false)
    expect(game.player!.deathCause).toMatchObject({ category: 'restriction', eventId: 'ancient-cultivator-cave' })
    expect(game.player!.dangerRecords[0]).toMatchObject({ survived: false, result: 'death' })
    expect(game.player!.eventRiskHistory[0].riskLevel).toBe(4)
    expect(game.finalizeMortalDeath()).toBe(true)
    expect(game.state.lifeRecords[0].deathCause?.category).toBe('restriction')
    expect(game.state.lifeRecords[0].importantEvents.some((entry) => entry.type === 'death')).toBe(true)
  })

  it('categorizes combat, adventure, breakthrough, heart-demon, restriction, possession and soul deaths', () => {
    expect(eventDeathCategory({ dangerTags: ['combat'] })).toBe('combat')
    expect(eventDeathCategory({ dangerTags: ['unknown-danger'] })).toBe('adventure')
    expect(eventDeathCategory({ dangerTags: ['breakthrough'] })).toBe('breakthrough')
    expect(eventDeathCategory({ dangerTags: ['inner-demon'] })).toBe('inner-demon')
    expect(eventDeathCategory({ dangerTags: ['restriction'] })).toBe('restriction')
    expect(eventDeathCategory({ dangerTags: ['possession'] })).toBe('possession')
    expect(eventDeathCategory({ dangerTags: ['soul-dispersal'] })).toBe('soul-dispersal')
  })
})

describe('V3.5 opportunity migration and recovery under the current save schema', () => {
  it('migrates V9 with empty V3.5 collections', () => {
    const save = saveFixture()
    const { eventRiskHistory: _risks, deathCause: _death, dangerRecords: _danger, majorOpportunities: _major, inheritanceHistory: _inheritance, ...legacyPlayer } = save.player!
    const migrated = migrateSave({ ...save, version: 9, player: legacyPlayer })
    expect(migrated.version).toBe(11)
    expect(migrated.player).toMatchObject({ eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [] })
    expect(migrated.player!.deathCause).toBeUndefined()
  })

  it('round-trips risk, danger, opportunity, inheritance and death data through JSON', () => {
    const save = saveFixture()
    save.player!.eventRiskHistory.push({ eventId: 'cave', eventName: '古修洞府', year: 120, choiceId: 'enter', riskLevel: 4, rewardLevel: 4, deathChance: .2, severeInjuryChance: .4, outcome: 'turning-point' })
    save.player!.dangerRecords.push({ eventId: 'cave', year: 120, source: '禁制', result: 'turning-point', survived: true })
    save.player!.majorOpportunities.push({ eventId: 'cave', name: '古修洞府', year: 120, rewardLevel: 4, result: '绝境转机' })
    save.player!.inheritanceHistory.push({ eventId: 'cave', name: '风雷遁甲经', year: 120, source: '古修传承' })
    save.player!.deathCause = { category: 'restriction', description: '触发洞府禁制', eventId: 'cave' }
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(11)
    expect(restored.player!.eventRiskHistory).toEqual(save.player!.eventRiskHistory)
    expect(restored.player!.dangerRecords).toEqual(save.player!.dangerRecords)
    expect(restored.player!.majorOpportunities).toEqual(save.player!.majorOpportunities)
    expect(restored.player!.inheritanceHistory).toEqual(save.player!.inheritanceHistory)
    expect(restored.player!.deathCause).toEqual(save.player!.deathCause)
  })
})
