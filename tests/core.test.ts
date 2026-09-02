import { describe, expect, it } from 'vitest'
import { calculateBreakthroughChance } from '../src/core/breakthrough/breakthrough'
import { rollLoot } from '../src/core/loot/loot'
import { RandomService } from '../src/core/random/RandomService'
import { calculateReincarnationPoints } from '../src/core/reincarnation/reincarnation'
import { deserializeSave, serializeSave } from '../src/core/save/serialization'
import { addMonths } from '../src/core/time/time'
import { REALMS } from '../src/data/realms'
import { playerFixture } from './fixtures'

describe('random service', () => {
  it('uses cumulative weights deterministically', () => {
    const rng = new RandomService(() => .75)
    expect(rng.weightedRandom([{ value: 'a', weight: 1 }, { value: 'b', weight: 3 }])).toBe('b')
  })
})

describe('existing game rules', () => {
  it('keeps the full V1 realm progression', () => {
    expect(REALMS).toHaveLength(23)
    expect(REALMS[11].name).toContain('筑基')
    expect(REALMS[REALMS.length - 1].name).toBe('元婴·圆满')
  })
  it('calculates bounded breakthrough chance', () => {
    const result = calculateBreakthroughChance(playerFixture())
    expect(result.final).toBeGreaterThanOrEqual(.12)
    expect(result.final).toBeLessThanOrEqual(.96)
  })
  it('advances world time by month', () => {
    const world = { currentYear: 100, currentMonth: 11, eraName: '玄历', worldEvents: [], sects: [], npcs: [], descendants: [], families: [] }
    addMonths(world, 3)
    expect([world.currentYear, world.currentMonth]).toEqual([101, 2])
  })
  it('rewards deeper realms with more reincarnation points', () => {
    const low = playerFixture(); const high = playerFixture(); high.realmIndex = 15
    expect(calculateReincarnationPoints(high)).toBeGreaterThan(calculateReincarnationPoints(low))
  })
  it('keeps loot pity behavior', () => {
    const player = playerFixture(); player.stats.luck = 0
    const result = rollLoot(player, { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, false, new RandomService(() => 0))
    expect(result.pity.rollsWithoutRare).toBe(1)
  })
})

describe('save serialization', () => {
  it('round trips V2 world state', () => {
    const base = deserializeSave(JSON.stringify({ version: 1, world: { currentYear: 300 }, reincarnation: {}, lifeRecords: [] }))
    expect(deserializeSave(serializeSave(base)).world.currentYear).toBe(300)
    expect(deserializeSave(serializeSave(base)).version).toBe(3)
  })
  it('rejects unrelated JSON', () => expect(() => deserializeSave('{"hello":true}')).toThrow())
})
