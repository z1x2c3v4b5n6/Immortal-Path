import { describe, expect, it } from 'vitest'
import { totalFreeStatPoints } from '../src/core/creation/creation'
import { modifyStatValue } from '../src/core/stats/stats'
import { CREATION_CONFIG, ROOT_STAT_POINT_BONUS } from '../src/data/creationConfig'
import { originById } from '../src/data/origins'
import { SPIRIT_ROOT_ARCHETYPES } from '../src/data/spiritRoots'
import { migrateSave } from '../src/core/save/serialization'

describe('V2.0.1 creation budgets', () => {
  it('uses the revised first-generation origin points', () => {
    expect(originById('farmer').freeStatPoints).toBe(50)
    expect(originById('hunter').freeStatPoints).toBe(45)
    expect(originById('merchant').freeStatPoints).toBe(35)
    expect(originById('scholar').freeStatPoints).toBe(35)
    expect(originById('mystery').freeStatPoints).toBe(45)
  })

  it('configures the correct spirit-root compensation', () => {
    expect(ROOT_STAT_POINT_BONUS).toEqual({ 1: 6, 2: 5, 3: 3, 4: 1, 5: 0 })
    expect(SPIRIT_ROOT_ARCHETYPES.map((root) => root.statPointBonus)).toEqual([0, 1, 3, 5, 6])
  })

  it('calculates origin plus root points without touching talent points', () => {
    const farmer = originById('farmer')
    const fiveRoot = SPIRIT_ROOT_ARCHETYPES[0]
    expect(totalFreeStatPoints(farmer, fiveRoot)).toBe(50)
    expect(CREATION_CONFIG.baseTalentPoints).toBe(5)
    expect('talentPoints' in farmer).toBe(false)
  })
})

describe('V2.0.1 dynamic stats and potential', () => {
  const potential = { comprehension: 60, luck: 60, constitution: 60, soul: 60, charm: 60 }

  it('allows positive growth during play', () => {
    const stats = { comprehension: 50, luck: 50, constitution: 50, soul: 50, charm: 50 }
    expect(modifyStatValue(stats, potential, 'comprehension', 5).appliedDelta).toBe(5)
    expect(stats.comprehension).toBe(55)
  })

  it('allows negative events to reduce a stat', () => {
    const stats = { comprehension: 50, luck: 50, constitution: 50, soul: 50, charm: 50 }
    expect(modifyStatValue(stats, potential, 'constitution', -7).appliedDelta).toBe(-7)
    expect(stats.constitution).toBe(43)
  })

  it('caps ordinary growth at potential', () => {
    const stats = { comprehension: 59, luck: 50, constitution: 50, soul: 50, charm: 50 }
    modifyStatValue(stats, potential, 'comprehension', 100)
    expect(stats.comprehension).toBe(60)
  })

  it('allows special effects to exceed potential', () => {
    const stats = { comprehension: 59, luck: 50, constitution: 50, soul: 50, charm: 50 }
    const result = modifyStatValue(stats, potential, 'comprehension', 6, true)
    expect(stats.comprehension).toBe(65)
    expect(result.exceededPotential).toBe(true)
  })

  it('does not lower an already exceptional stat when ordinary growth is capped', () => {
    const stats = { comprehension: 66, luck: 50, constitution: 50, soul: 50, charm: 50 }
    expect(modifyStatValue(stats, potential, 'comprehension', 3).appliedDelta).toBe(0)
    expect(stats.comprehension).toBe(66)
    modifyStatValue(stats, potential, 'comprehension', -2)
    expect(stats.comprehension).toBe(64)
  })
})

describe('V2 save migration', () => {
  it('adds potential and root compensation to an old V2 player', () => {
    const save = migrateSave({
      version: 2,
      world: { currentYear: 160, currentMonth: 1, eraName: '玄历', worldEvents: [], sects: [], npcs: [], descendants: [], families: [] },
      player: { id: 'v2', name: '顾玄', generation: 2, birthYear: 120, ageMonths: 480, lifespanMonths: 1200, realmIndex: 2, cultivation: 0, cultivationRequired: 300, spiritRoot: { id: 'five', name: '五灵根', rank: 1, multiplier: .86, elements: ['金', '木', '水', '火', '土'] }, stats: { comprehension: 55, luck: 55, constitution: 60, soul: 50, charm: 50 }, spiritStones: 1, inventory: [], talents: [], talentPoints: 5, origin: { id: 'farmer' }, familyId: 'f', bloodline: { familyId: 'f', familyName: '顾氏', bloodlineLevel: 1, inheritedTraits: [] }, entryType: 'reincarnation', alive: true, achievements: [], timeline: [] },
      lifeRecords: [], reincarnation: { totalPoints: 0 }, settings: {}, pity: {}, logs: [], pendingEvent: null,
    })
    expect(save.version).toBe(8)
    expect(save.player?.spiritRoot.statPointBonus).toBe(0)
    expect(save.player?.statPotential.constitution).toBeGreaterThanOrEqual(save.player?.stats.constitution ?? 0)
    expect(save.player?.statHistory).toEqual([])
  })
})
