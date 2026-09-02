import { describe, expect, it } from 'vitest'
import { allocateStat, availableTalents, generateDescendant, randomizeStats, randomSpiritRoot, randomTalentIds, STAT_KEYS, validateBuild } from '../src/core/creation/creation'
import { RandomService } from '../src/core/random/RandomService'
import { applyFatePurchase, canPurchaseFate, initialReincarnation } from '../src/core/reincarnation/reincarnation'
import { ORIGINS, originById } from '../src/data/origins'
import { manualSpiritRoot } from '../src/data/spiritRoots'
import { playerFixture } from './fixtures'

describe('V2 origin and stat allocation', () => {
  it('provides five distinct first-generation templates', () => {
    const first = ORIGINS.filter((origin) => origin.firstGenerationAvailable)
    expect(first).toHaveLength(5)
    expect(new Set(first.map((origin) => JSON.stringify(origin.baseStats))).size).toBe(5)
    expect(originById('merchant').startingSpiritStones).toBeGreaterThan(originById('farmer').startingSpiritStones)
  })
  it('gives origins different stat caps', () => {
    expect(originById('scholar').statCaps.comprehension).toBeGreaterThan(originById('hunter').statCaps.comprehension)
    expect(originById('mystery').statCaps.soul).toBeGreaterThan(originById('farmer').statCaps.soul)
  })
  it('never allocates beyond an origin cap', () => {
    const origin = originById('merchant')
    const capped = { ...origin.baseStats, constitution: origin.statCaps.constitution }
    const result = allocateStat(capped, 'constitution', 1, origin, 0, 10)
    expect(result.stats.constitution).toBe(origin.statCaps.constitution)
    expect(result.remaining).toBe(10)
  })
  it('random allocation spends the same fair budget', () => {
    const origin = originById('farmer')
    const result = randomizeStats(origin, 0, new RandomService(() => .41))
    const spent = STAT_KEYS.reduce((sum, key) => sum + result[key] - origin.baseStats[key], 0)
    expect(spent).toBe(origin.freeStatPoints)
    expect(STAT_KEYS.every((key) => result[key] <= origin.statCaps[key])).toBe(true)
  })
})

describe('V2 spirit roots and talents', () => {
  it('randomizes spirit roots through the centralized RNG', () => {
    expect(randomSpiritRoot(new RandomService(() => 0), 0, 7).rank).toBe(1)
    expect(randomSpiritRoot(new RandomService(() => .9999), 15, 7).rank).toBe(7)
  })
  it('supports a valid manual elemental root choice', () => {
    const origin = originById('farmer')
    const root = manualSpiritRoot(4, ['水', '木'])
    const build = { name: '杨玄', originId: origin.id, spiritRoot: root, stats: randomizeStats(origin, 0, new RandomService(() => .3), root.statPointBonus), talentIds: [], talentBudget: 5, randomRoot: false, randomTalents: false }
    expect(build.spiritRoot.name).toBe('水木双灵根')
    expect(validateBuild(build, origin, 0, availableTalents(initialReincarnation(), 0, true))).toBe('')
  })
  it('random talent combinations stay within budget and can contain many talents', () => {
    const reincarnation = initialReincarnation()
    const pool = availableTalents(reincarnation, 0, true)
    const ids = randomTalentIds(6, pool, new RandomService(() => .2))
    const spent = pool.filter((talent) => ids.includes(talent.id)).reduce((sum, talent) => sum + talent.cost, 0)
    expect(spent).toBeLessThanOrEqual(6)
    expect(ids.length).toBeGreaterThan(1)
  })
})

describe('V2 bloodline and fate permissions', () => {
  it('generates a descendant from inheritance plus variation', () => {
    const parent = playerFixture()
    const child = generateDescendant(parent, 140, new RandomService(() => .37))
    expect(child.parents).toContain(parent.id)
    expect(child.familyId).toBe(parent.familyId)
    expect(child.stats).not.toEqual(parent.stats)
    expect(child.spiritRoot).toBeDefined()
  })
  it('spends reincarnation points on one-life permissions', () => {
    const state = initialReincarnation(); state.totalPoints = 300; state.inHall = true
    expect(canPurchaseFate(state, 'talentPoint')).toBe(true)
    expect(applyFatePurchase(state, 'talentPoint')).toBe(true)
    expect(state.selections.extraTalentPoints).toBe(1)
    expect(state.totalPoints).toBe(245)
  })
})
