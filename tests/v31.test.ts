import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { acquireSpiritRoot, calculateFiveElementBalance, createSpiritualAptitude, effectiveElementPower, growElement, isFiveElementImbalanced, purifySpiritRoot, stabilizeSpiritRoot, transformAcquiredRoot } from '../src/core/aptitude/aptitude'
import { canUnlockAcquiredTalent, checkAcquiredTalentUnlocks } from '../src/core/talents/acquiredTalents'
import { calculateTechniqueAffinity, practiceTechnique } from '../src/core/techniques/techniques'
import { calculateCultivationGain } from '../src/core/cultivation/cultivation'
import { migrateSave } from '../src/core/save/serialization'
import { ACQUIRED_TALENTS, acquiredTalentById } from '../src/data/acquiredTalents'
import { APTITUDE_EVENTS } from '../src/data/events/aptitudeEvents'
import { createSpiritRoot, STANDARD_ELEMENTS } from '../src/data/spiritRoots'
import { TALENTS } from '../src/data/talents'
import { TECHNIQUES, techniqueById } from '../src/data/techniques'
import { useGameStore } from '../src/stores/game'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

describe('V3.1 spiritual aptitude', () => {
  it('keeps the innate root separate from acquired roots', () => {
    const innate = createSpiritRoot(['水', '木'])
    const aptitude = createSpiritualAptitude(innate)
    acquireSpiritRoot(aptitude, '雷', 72, 44, '雷劫淬体', 120, 6)
    expect(aptitude.innateRoot.elements).toEqual(['水', '木'])
    expect(aptitude.acquiredRoots[0]).toMatchObject({ element: '雷', purity: 72, stability: 44, source: '雷劫淬体' })
  })

  it('supports all six acquired-root sources as real events', () => {
    const sources = APTITUDE_EVENTS.flatMap((event) => event.options.flatMap((option) => option.outcomes.flatMap((outcome) => outcome.effects))).filter((effect) => effect.type === 'acquireRoot').map((effect) => effect.source)
    expect(sources).toEqual(expect.arrayContaining(['天材地宝', '雷劫淬体', '秘境传承', '血脉觉醒', '魔道夺灵', '轮回残留']))
  })

  it('purifies and stabilizes slowly without exceeding 100', () => {
    const aptitude = createSpiritualAptitude(createSpiritRoot(['木']))
    acquireSpiritRoot(aptitude, '冰', 98, 97, '秘境传承', 1, 1)
    expect(purifySpiritRoot(aptitude, '冰', 8)).toBe(2)
    expect(stabilizeSpiritRoot(aptitude, '冰', 8)).toBe(3)
    expect(aptitude.acquiredRoots[0]).toMatchObject({ purity: 100, stability: 100 })
  })

  it('tracks elemental growth and five-element balance', () => {
    const aptitude = createSpiritualAptitude(createSpiritRoot(STANDARD_ELEMENTS))
    expect(calculateFiveElementBalance(aptitude)).toBe(100)
    growElement(aptitude, '火', 30)
    expect(calculateFiveElementBalance(aptitude)).toBe(25)
  })

  it('makes an acquired root improve effective elemental power', () => {
    const aptitude = createSpiritualAptitude(createSpiritRoot(['木']))
    const before = effectiveElementPower(aptitude, '雷')
    acquireSpiritRoot(aptitude, '雷', 80, 90, '雷劫淬体', 1, 1)
    expect(effectiveElementPower(aptitude, '雷')).toBeGreaterThan(before)
  })

  it('keeps an acquired root weaker than the same innate root', () => {
    const innate = createSpiritualAptitude(createSpiritRoot(['火']))
    const acquired = createSpiritualAptitude(createSpiritRoot(['木']))
    acquireSpiritRoot(acquired, '火', 100, 100, '天材地宝', 1, 1)
    expect(effectiveElementPower(acquired, '火')).toBeLessThan(effectiveElementPower(innate, '火'))
  })

  it('detects five-element imbalance without a heavy binary lock', () => {
    const aptitude = createSpiritualAptitude(createSpiritRoot(STANDARD_ELEMENTS))
    aptitude.elementalGrowth = { ...aptitude.elementalGrowth, 金: 95, 木: 31, 水: 87, 火: 20, 土: 75 }
    expect(isFiveElementImbalanced(aptitude)).toBe(true)
    expect(calculateFiveElementBalance(aptitude)).toBeGreaterThanOrEqual(0)
  })

  it('supports costly acquired-root transformation without overwriting innate roots', () => {
    const aptitude = createSpiritualAptitude(createSpiritRoot(['木']))
    const root = acquireSpiritRoot(aptitude, '火', 70, 70, '天材地宝', 1, 1)
    expect(transformAcquiredRoot(aptitude, root.id, '雷', '雷劫蜕变')).toBe(true)
    expect(root).toMatchObject({ element: '雷', purity: 62, stability: 58 })
    expect(aptitude.innateRoot.elements).toEqual(['木'])
  })
})

describe('V3.1 techniques and affinity', () => {
  it('provides at least twenty techniques across every element and path', () => {
    expect(TECHNIQUES.length).toBeGreaterThanOrEqual(20)
    const elements = new Set(TECHNIQUES.flatMap((technique) => technique.elements.map((entry) => entry.element)))
    const paths = new Set(TECHNIQUES.flatMap((technique) => technique.preferredPaths))
    expect([...elements]).toEqual(expect.arrayContaining(['金', '木', '水', '火', '土', '雷', '冰', '风', '暗', '光']))
    expect([...paths]).toEqual(expect.arrayContaining(['dao', 'sword', 'body', 'demonic', 'ghost']))
  })

  it('returns the complete affinity breakdown and dynamic level cap', () => {
    const player = playerFixture({ primaryPath: 'sword', pathProgress: [{ pathId: 'sword', experience: 0, level: 8 }] })
    const result = calculateTechniqueAffinity(player, techniqueById('metal-water-sword')!, worldFixture())
    expect(Object.keys(result.breakdown)).toEqual(['spiritRoot', 'path', 'comprehension', 'talents', 'world', 'other'])
    expect(result.total).toBeGreaterThan(0)
    expect(result.maxTechniqueLevel).toBeGreaterThan(1)
  })

  it('treats a missing root as low affinity rather than a universal prohibition', () => {
    const player = playerFixture()
    const result = calculateTechniqueAffinity(player, techniqueById('thunder-sword')!, worldFixture())
    expect(result.total).toBeGreaterThan(0)
    expect(result.grade).toBeDefined()
  })

  it('raises affinity as an acquired root is obtained and purified', () => {
    const technique = techniqueById('blazing-sun')!
    const low = playerFixture()
    const missing = calculateTechniqueAffinity(low, technique, worldFixture()).total
    acquireSpiritRoot(low.spiritualAptitude, '火', 40, 75, '天材地宝', 1, 1)
    const acquired = calculateTechniqueAffinity(low, technique, worldFixture()).total
    purifySpiritRoot(low.spiritualAptitude, '火', 50)
    const purified = calculateTechniqueAffinity(low, technique, worldFixture()).total
    expect(acquired).toBeGreaterThan(missing)
    expect(purified).toBeGreaterThan(acquired)
  })

  it('uses acquired-root stability independently in technique risk', () => {
    const unstable = playerFixture()
    const stable = playerFixture()
    acquireSpiritRoot(unstable.spiritualAptitude, '火', 80, 20, '夺灵', 1, 1)
    acquireSpiritRoot(stable.spiritualAptitude, '火', 80, 90, '温养', 1, 1)
    expect(calculateTechniqueAffinity(unstable, techniqueById('blazing-sun')!, worldFixture()).riskModifier).toBeGreaterThan(calculateTechniqueAffinity(stable, techniqueById('blazing-sun')!, worldFixture()).riskModifier)
  })

  it('handles dual-element, five-element, path and comprehension affinity', () => {
    const player = playerFixture({ primaryPath: 'dao' })
    const dual = calculateTechniqueAffinity(player, techniqueById('water-wood-life')!, worldFixture()).total
    const five = calculateTechniqueAffinity(player, techniqueById('five-cycle')!, worldFixture()).total
    const lowComprehension = calculateTechniqueAffinity(player, techniqueById('water-wood-life')!, worldFixture()).total
    player.stats.comprehension = 100
    const highComprehension = calculateTechniqueAffinity(player, techniqueById('water-wood-life')!, worldFixture()).total
    const swordPath = playerFixture({ primaryPath: 'sword', pathProgress: [{ pathId: 'sword', level: 8, experience: 0 }] })
    const bodyPath = playerFixture({ primaryPath: 'body', pathProgress: [{ pathId: 'body', level: 8, experience: 0 }] })
    expect(dual).toBeGreaterThan(five)
    expect(highComprehension).toBeGreaterThan(lowComprehension)
    expect(calculateTechniqueAffinity(swordPath, techniqueById('metal-water-sword')!, worldFixture()).total).toBeGreaterThan(calculateTechniqueAffinity(bodyPath, techniqueById('metal-water-sword')!, worldFixture()).total)
  })

  it('lets body techniques use constitution and ghost techniques use soul stability', () => {
    const weakBody = playerFixture({ primaryPath: 'body' })
    const strongBody = playerFixture({ primaryPath: 'body', stats: { ...playerFixture().stats, constitution: 100 } })
    const weakGhost = playerFixture({ primaryPath: 'ghost', soulStability: 20 })
    const strongGhost = playerFixture({ primaryPath: 'ghost', soulStability: 90, stats: { ...playerFixture().stats, soul: 100 } })
    expect(calculateTechniqueAffinity(strongBody, techniqueById('vajra-body')!, worldFixture()).total).toBeGreaterThan(calculateTechniqueAffinity(weakBody, techniqueById('vajra-body')!, worldFixture()).total)
    expect(calculateTechniqueAffinity(strongGhost, techniqueById('dark-ghost')!, worldFixture()).total).toBeGreaterThan(calculateTechniqueAffinity(weakGhost, techniqueById('dark-ghost')!, worldFixture()).total)
  })

  it('makes affinity affect actual cultivation efficiency', () => {
    const root = createSpiritRoot(['雷'], 'HEAVENLY')
    const high = playerFixture({ spiritRoot: root, spiritualAptitude: createSpiritualAptitude(root), primaryPath: 'sword', activeTechnique: 'thunder-sword', knownTechniques: ['thunder-sword'] })
    const low = playerFixture({ primaryPath: 'body', activeTechnique: 'thunder-sword', knownTechniques: ['thunder-sword'] })
    expect(calculateCultivationGain(high, 12, worldFixture())).toBeGreaterThan(calculateCultivationGain(low, 12, worldFixture()))
  })

  it('models body, sword, demonic and ghost techniques with distinct dependencies', () => {
    expect(techniqueById('vajra-body')!.rootDependency).toBeLessThan(techniqueById('five-cycle')!.rootDependency)
    expect(techniqueById('sword-heart')!.rootDependency).toBeLessThan(.2)
    expect(techniqueById('blood-demon')!.rootDependency).toBeLessThan(.3)
    expect(techniqueById('dark-ghost')!.rootDependency).toBeLessThan(.5)
  })

  it('levels an active technique but respects its affinity-derived cap', () => {
    const player = playerFixture({ primaryPath: 'dao', pathProgress: [{ pathId: 'dao', experience: 0, level: 5 }] })
    const technique = techniqueById('deep-water')!
    const cap = calculateTechniqueAffinity(player, technique, worldFixture()).maxTechniqueLevel
    for (let index = 0; index < 100; index++) practiceTechnique(player, technique, 120, worldFixture())
    expect(player.techniqueProgress[0].level).toBe(cap)
  })
})

describe('V3.1 acquired talents and reincarnation', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defines all eight acquired talents outside the creation talent pool', () => {
    expect(ACQUIRED_TALENTS.map((talent) => talent.id)).toEqual(['five-unity', 'sword-heart', 'battle-body', 'nine-lives', 'late-bloom', 'demon-heart', 'defy-fate', 'heaven-chosen'])
    expect(TALENTS.some((talent) => ACQUIRED_TALENTS.some((acquired) => acquired.id === talent.id))).toBe(false)
  })

  it('requires innate five roots, growth 80, balance 90, Gold Core and the insight event for five-element unity', () => {
    const root = createSpiritRoot(STANDARD_ELEMENTS)
    const aptitude = createSpiritualAptitude(root)
    for (const element of STANDARD_ELEMENTS) aptitude.elementalGrowth[element] = 80
    const player = playerFixture({ spiritRoot: root, spiritualAptitude: aptitude, realmIndex: 11 })
    expect(checkAcquiredTalentUnlocks(player, 100, 2).map((talent) => talent.talentId)).not.toContain('five-unity')
    expect(checkAcquiredTalentUnlocks(player, 100, 2, 'five-unity-insight').map((talent) => talent.talentId)).toContain('five-unity')
  })

  it('keeps event-gated talents locked until the matching insight', () => {
    const player = playerFixture({ primaryPath: 'sword', stats: { comprehension: 85, luck: 60, constitution: 60, soul: 60, charm: 60 }, pathProgress: [{ pathId: 'sword', experience: 0, level: 8 }], pathResources: { ...playerFixture().pathResources, swordIntent: 80 } })
    expect(checkAcquiredTalentUnlocks(player, 100, 2).map((talent) => talent.talentId)).not.toContain('sword-heart')
    expect(checkAcquiredTalentUnlocks(player, 100, 2, 'sword-heart-insight').map((talent) => talent.talentId)).toContain('sword-heart')
  })

  it('checks the remaining acquired talents from actual counters and paths', () => {
    const body = playerFixture({ primaryPath: 'body', stats: { ...playerFixture().stats, constitution: 85 }, pathProgress: [{ pathId: 'body', level: 6, experience: 0 }], dangerousEventCount: 8, severeInjuryCount: 3 })
    const survivor = playerFixture({ nearDeathCount: 9 })
    const elder = playerFixture({ lateMajorBreakthroughs: 2 })
    const demon = playerFixture({ primaryPath: 'demonic', pathProgress: [{ pathId: 'demonic', level: 7, experience: 0 }], pathResources: { ...playerFixture().pathResources, demonicNature: 80, innerDemon: 60 } })
    const fate = playerFixture({ nearDeathCount: 1 })
    const chosen = playerFixture({ rareEventCount: 8, luckyOutcomeStreak: 5, stats: { ...playerFixture().stats, luck: 85 } })
    expect(canUnlockAcquiredTalent(body, acquiredTalentById('battle-body')!)).toBe(true)
    expect(canUnlockAcquiredTalent(survivor, acquiredTalentById('nine-lives')!)).toBe(true)
    expect(canUnlockAcquiredTalent(elder, acquiredTalentById('late-bloom')!)).toBe(true)
    expect(canUnlockAcquiredTalent(demon, acquiredTalentById('demon-heart')!, 'demon-heart-trial')).toBe(true)
    expect(canUnlockAcquiredTalent(fate, acquiredTalentById('defy-fate')!, 'defy-fate-breakthrough')).toBe(true)
    expect(canUnlockAcquiredTalent(chosen, acquiredTalentById('heaven-chosen')!, 'mandate-revelation')).toBe(true)
  })

  it('never grants the same acquired talent twice', () => {
    const player = playerFixture({ nearDeathCount: 9 })
    checkAcquiredTalentUnlocks(player, 100, 1)
    checkAcquiredTalentUnlocks(player, 101, 1)
    expect(player.acquiredTalents.filter((talent) => talent.talentId === 'nine-lives')).toHaveLength(1)
  })

  it('records acquired talents in the chronicle and unlocks their reincarnation consequence only on final death', () => {
    const player = playerFixture({ alive: false, acquiredTalents: [{ talentId: 'five-unity', name: '五行归一', acquiredYear: 120, acquiredMonth: 1, source: '修行积累' }] })
    const game = useGameStore()
    game.replaceState(saveFixture({ player, world: worldFixture({ families: [{ id: player.familyId, name: '沈氏', founderId: player.id, foundedYear: 84, wealth: 0, inventory: [], reputation: 0, bloodline: player.bloodline, memberIds: [player.id], kind: '凡人家族', resources: 0, fame: 0, territory: '故乡村镇', history: [] }] }) }))
    expect(game.state.reincarnation.unlockedTalents).not.toContain('five-element-seed')
    expect(game.finalizeMortalDeath()).toBe(true)
    expect(game.state.lifeRecords[0].acquiredTalents[0].talentId).toBe('five-unity')
    expect(game.state.reincarnation.unlockedTalents).toContain('five-element-seed')
  })
})

describe('V3.1 fields through current save migration', () => {
  it.each([1, 2, 3, 4, 5])('migrates V%i saves to a complete current player', (version) => {
    const legacy = saveFixture({ version })
    const { spiritualAptitude: _aptitude, acquiredTalents: _talents, knownTechniques: _known, techniqueProgress: _progress, ...legacyPlayer } = legacy.player!
    const migrated = migrateSave({ ...legacy, player: legacyPlayer })
    expect(migrated.version).toBe(11)
    expect(migrated.player?.spiritualAptitude.innateRoot).toMatchObject({ elements: ['水', '木'] })
    expect(migrated.player?.acquiredTalents).toEqual([])
    expect(migrated.player?.knownTechniques).toContain('plain-breath')
  })

  it('preserves acquired roots, techniques and talents in a current round trip', () => {
    const save = saveFixture()
    acquireSpiritRoot(save.player!.spiritualAptitude, '雷', 76, 64, '雷劫淬体', 123, 4)
    save.player!.knownTechniques.push('thunder-sword')
    save.player!.activeTechnique = 'thunder-sword'
    save.player!.acquiredTalents.push({ talentId: 'nine-lives', name: '九死一生', acquiredYear: 123, acquiredMonth: 4, source: '修行积累' })
    const migrated = migrateSave(save)
    expect(migrated.player?.spiritualAptitude.acquiredRoots[0]).toMatchObject({ element: '雷', purity: 76, stability: 64 })
    expect(migrated.player?.activeTechnique).toBe('thunder-sword')
    expect(migrated.player?.acquiredTalents[0].talentId).toBe('nine-lives')
  })
})
