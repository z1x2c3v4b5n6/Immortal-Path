import { describe, expect, it } from 'vitest'
import { calculateTechniqueAffinity, getSpiritRootBreakthroughModifier } from '../src/core/spiritRoot/spiritRoot'
import { availableTalents, isManualSpiritRootAllowed, manualRootPolicy } from '../src/core/creation/creation'
import { applyFatePurchase, initialReincarnation } from '../src/core/reincarnation/reincarnation'
import { migrateSave } from '../src/core/save/serialization'
import { createSpiritRoot, formatSpiritRootName, ROOT_COUNT_RULES } from '../src/data/spiritRoots'

describe('V2.1 spirit-root breadth and specialization', () => {
  it.each([
    [5, 1.35, .90, 0],
    [4, 1.27, .98, 1],
    [3, 1.18, 1.08, 3],
    [2, 1.10, 1.22, 5],
    [1, 1.00, 1.40, 6],
  ])('%i roots use configured cultivation, specialization and point compensation', (count, cultivation, specialization, points) => {
    const root = createSpiritRoot(['金', '木', '水', '火', '土'].slice(0, count) as Array<'金' | '木' | '水' | '火' | '土'>)
    expect(root.cultivationMultiplier).toBe(cultivation)
    expect(root.specializationMultiplier).toBe(specialization)
    expect(root.statPointBonus).toBe(points)
  })

  it('makes a single root more specialized than a dual root', () => {
    expect(createSpiritRoot(['火']).specializationMultiplier).toBe(1.40)
    expect(createSpiritRoot(['水', '木']).specializationMultiplier).toBe(1.22)
  })

  it('models heavenly as quality and supports the rare five-element heavenly root', () => {
    const heavenly = createSpiritRoot(['雷'], 'HEAVENLY')
    const fiveElement = createSpiritRoot(['金', '木', '水', '火', '土'], 'HEAVENLY')
    expect(heavenly.quality).toBe('HEAVENLY')
    expect(heavenly.cultivationMultiplier).toBeGreaterThan(1)
    expect(fiveElement.name).toBe('五行天灵根')
    expect(fiveElement.cultivationMultiplier).toBe(1.60)
  })

  it('keeps mutated elements as elements instead of a rank', () => {
    const root = createSpiritRoot(['金', '雷'])
    expect(root.elements).toEqual(['金', '雷'])
    expect(root.mutations).toEqual(['雷'])
    expect(root.name).toBe('金雷双灵根')
  })

  it('formats names once without duplicated suffixes or elements', () => {
    const root = createSpiritRoot(['雷', '雷', '冰'], 'PURE')
    expect(root.elements).toEqual(['雷', '冰'])
    expect(formatSpiritRootName(root)).toBe('纯净雷冰双灵根')
    expect(formatSpiritRootName(root)).not.toContain('双灵根双灵根')
  })

  it('calculates technique affinity from coverage and specialization', () => {
    const root = createSpiritRoot(['水', '木'])
    const water = calculateTechniqueAffinity(root, ['水'])
    const fire = calculateTechniqueAffinity(root, ['火'])
    expect(water.multiplier).toBe(1.22)
    expect(water.matchedElements).toEqual(['水'])
    expect(fire.multiplier).toBeLessThan(water.multiplier)
    expect(fire.missingElements).toEqual(['火'])
  })

  it('returns the configured breakthrough modifier', () => {
    expect(getSpiritRootBreakthroughModifier(createSpiritRoot(['火']))).toBe(.05)
    expect(getSpiritRootBreakthroughModifier(createSpiritRoot(['金', '木', '水', '火', '土']))).toBe(-.03)
  })

  it('keeps random breadth probabilities explicit and normalized by weights', () => {
    expect(ROOT_COUNT_RULES.map((rule) => rule.randomWeight).reduce((sum, value) => sum + value, 0)).toBe(100)
  })
})

describe('V2.1 manual permissions', () => {
  it('limits the first generation to standard five/four/three/dual roots', () => {
    const state = initialReincarnation()
    const policy = manualRootPolicy(true, state)
    expect(policy.counts).toEqual([5, 4, 3, 2])
    expect(policy.elements).toEqual(['金', '木', '水', '火', '土'])
    expect(policy.qualities).toEqual(['NORMAL'])
    expect(isManualSpiritRootAllowed(createSpiritRoot(['火']), policy)).toBe(false)
    expect(isManualSpiritRootAllowed(createSpiritRoot(['雷', '火']), policy)).toBe(false)
  })

  it('opens single, mutation, PURE and HEAVENLY choices through later-life permissions', () => {
    const state = initialReincarnation(); state.inHall = true; state.totalPoints = 2000
    for (const purchase of ['rootSingle', 'rootVariant', 'rootPure', 'rootHeaven'] as const) expect(applyFatePurchase(state, purchase)).toBe(true)
    const policy = manualRootPolicy(false, state)
    expect(policy.counts).toContain(1)
    expect(policy.elements).toContain('雷')
    expect(policy.qualities).toEqual(['NORMAL', 'PURE', 'HEAVENLY'])
    expect(isManualSpiritRootAllowed(createSpiritRoot(['雷'], 'HEAVENLY'), policy)).toBe(true)
  })

  it('can unlock legendary talent selection after its high-cost permission and generation condition', () => {
    const state = initialReincarnation(); state.inHall = true; state.totalPoints = 2000
    for (const purchase of ['talentRare', 'talentEpic', 'talentLegendary'] as const) expect(applyFatePurchase(state, purchase)).toBe(true)
    expect(availableTalents(state, 7, false).some((talent) => talent.id === 'immortal-soul')).toBe(true)
  })
})

function legacySave(version: number, spiritRoot: Record<string, unknown>, reincarnation: Record<string, unknown> = {}) {
  return {
    version,
    world: { currentYear: 160, currentMonth: 1, eraName: '玄历', worldEvents: [], sects: [], npcs: [], descendants: [], families: [] },
    player: { id: 'legacy', name: '顾玄', generation: 1, spiritRoot, stats: { comprehension: 50, luck: 50, constitution: 50, soul: 50, charm: 50 }, talents: [], origin: { id: 'farmer' }, inventory: [], achievements: [], timeline: [] },
    lifeRecords: [], reincarnation, settings: {}, pity: {}, logs: [], pendingEvent: null,
  }
}

describe('V4 spirit-root migration', () => {
  it('migrates a V3 dual root and old permissions to the new fields', () => {
    const save = migrateSave(legacySave(3, { name: '水木双灵根', rank: 4, multiplier: 1.22, elements: ['水', '木'] }, { rareEventCount: 4, selections: { maxRootRank: 7 } }))
    expect(save.version).toBe(11)
    expect(save.player?.spiritRoot).toMatchObject({ elements: ['水', '木'], quality: 'NORMAL', cultivationMultiplier: 1.10, specializationMultiplier: 1.22, breakthroughModifier: .025, statPointBonus: 5 })
    expect(save.reincarnation.rareEventCount).toBe(0)
    expect(save.reincarnation.rareLootCount).toBe(4)
    expect(save.reincarnation.selections).toMatchObject({ canChooseSingleRoot: true, canChooseMutatedElements: true, maxRootQuality: 'HEAVENLY' })
  })

  it.each([
    [1, 1, ['金', '木', '水', '火', '土'], 'NORMAL'],
    [2, 4, ['木', '水', '火', '土'], 'NORMAL'],
    [1, 6, ['风', '雷'], 'NORMAL'],
    [2, 7, ['金', '木', '水', '火', '土'], 'HEAVENLY'],
  ])('migrates V%i legacy rank %i roots', (version, rank, elements, quality) => {
    const oldElements = rank === 7 ? ['混元'] : elements
    const root = migrateSave(legacySave(version, { rank, elements: oldElements, name: rank === 7 ? '混元天灵根' : '旧灵根' })).player!.spiritRoot
    expect(root.elements).toEqual(elements)
    expect(root.quality).toBe(quality)
    expect(root.cultivationMultiplier).toBeTypeOf('number')
    expect(root.specializationMultiplier).toBeTypeOf('number')
    expect(root.breakthroughModifier).toBeTypeOf('number')
  })
})
