import { describe, expect, it } from 'vitest'
import { calculateBreakthroughChance } from '../src/core/breakthrough/breakthrough'
import { rollLoot } from '../src/core/loot/loot'
import { RandomService } from '../src/core/random/RandomService'
import { calculateReincarnationPoints } from '../src/core/reincarnation/reincarnation'
import { deserializeSave, serializeSave } from '../src/core/save/serialization'
import { addMonths } from '../src/core/time/time'
import { REALMS } from '../src/data/realms'
import type { GameSave, Player } from '../src/models'

const player = (): Player => ({
  id: 'p', name: '沈砚', generation: 1, birthYear: 84, ageMonths: 240, lifespanMonths: 1200,
  realmIndex: 1, cultivation: 200, cultivationRequired: 255,
  spiritRoot: { id: 'dual', name: '双灵根', rank: 4, multiplier: 1.2, elements: ['水', '木'] },
  stats: { comprehension: 60, luck: 60, constitution: 50, soul: 50, charm: 50 }, spiritStones: 0,
  inventory: [], talents: [], origin: { id: 'o', name: '农户', description: '', stones: 0, statChanges: {}, rootLuck: 0 },
  alive: true, achievements: [], timeline: [],
})

describe('random service', () => {
  it('uses cumulative weights deterministically', () => {
    const rng = new RandomService(() => 0.75)
    expect(rng.weightedRandom([{ value: 'a', weight: 1 }, { value: 'b', weight: 3 }])).toBe('b')
  })
})

describe('game rules', () => {
  it('has the full V1 realm progression', () => {
    expect(REALMS).toHaveLength(23)
    expect(REALMS[11].name).toContain('筑基')
    expect(REALMS[REALMS.length - 1].name).toBe('元婴·圆满')
  })
  it('calculates bounded breakthrough chance', () => {
    const result = calculateBreakthroughChance(player())
    expect(result.final).toBeGreaterThanOrEqual(0.12)
    expect(result.final).toBeLessThanOrEqual(0.96)
  })
  it('detects lifespan by month after time advancement', () => {
    const world = { currentYear: 100, currentMonth: 11, eraName: '玄历', worldEvents: [], sects: [], npcs: [] }
    addMonths(world, 3)
    expect(world.currentYear).toBe(101)
    expect(world.currentMonth).toBe(2)
  })
  it('rewards deeper realms with more reincarnation points', () => {
    const low = player(); const high = player(); high.realmIndex = 15
    expect(calculateReincarnationPoints(high)).toBeGreaterThan(calculateReincarnationPoints(low))
  })
  it('advances pity when low quality drops', () => {
    const p = player(); p.stats.luck = 0
    const result = rollLoot(p, { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, false, new RandomService(() => 0))
    expect(result.pity.rollsWithoutRare).toBe(1)
  })
})

describe('save serialization', () => {
  it('round trips without losing world state', () => {
    const save = { id: 'main', version: 1, world: { currentYear: 300 } } as GameSave
    expect(deserializeSave(serializeSave(save)).world.currentYear).toBe(300)
  })
  it('rejects unrelated JSON', () => expect(() => deserializeSave('{"hello":true}')).toThrow())
})
