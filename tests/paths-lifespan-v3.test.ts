import { describe, expect, it } from 'vitest'
import { calculateMaxLifespanMonths, agingStage, constitutionLifespanModifier, isNaturalLifespanExpired } from '../src/core/lifespan/lifespan'
import { addPathExperience, addSecondaryPath, applyPathTraining, burnLifespanForCultivation, choosePrimaryPath, pathCultivationMultiplier } from '../src/core/paths/paths'
import { REALMS } from '../src/data/realms'
import { instantiateTalent, talentById } from '../src/data/talents'
import { playerFixture, worldFixture } from './fixtures'

const realmIndex = (group: string) => REALMS.findIndex((realm) => realm.group === group)
const neutralPlayer = () => playerFixture({ stats: { comprehension: 55, luck: 50, constitution: 55, soul: 55, charm: 50 }, lifespanFateModifier: 0, lifespanBonusMonths: 0, talents: [], pathProgress: [], secondaryPaths: [] })

describe('V3 cultivation paths', () => {
  it('provides stable baseline growth for Dao cultivation', () => {
    const player = neutralPlayer(); expect(choosePrimaryPath(player, 'dao')).toBe(true)
    expect(pathCultivationMultiplier(player, worldFixture())).toBeGreaterThan(.8)
  })

  it('grows sword intent through sword practice', () => {
    const player = neutralPlayer(); choosePrimaryPath(player, 'sword')
    applyPathTraining(player, 12, worldFixture())
    expect(player.pathResources.swordIntent).toBeGreaterThan(0)
  })

  it('grows body qi-blood and returns constitution growth', () => {
    const player = neutralPlayer(); choosePrimaryPath(player, 'body')
    const result = applyPathTraining(player, 24, worldFixture())
    expect(player.pathResources.maxQiBlood).toBeGreaterThan(100)
    expect(result.statGrowth?.constitution).toBeGreaterThan(0)
  })

  it('gives demonic cultivation a reward and inner-demon cost', () => {
    const player = neutralPlayer(); player.unlockedPaths.push('demonic'); choosePrimaryPath(player, 'demonic')
    const before = pathCultivationMultiplier(player, worldFixture())
    applyPathTraining(player, 12, worldFixture())
    expect(player.pathResources.innerDemon).toBeGreaterThan(0)
    expect(pathCultivationMultiplier(player, worldFixture())).toBeGreaterThanOrEqual(before)
  })

  it('lets ghost practice restore soul stability', () => {
    const player = neutralPlayer(); player.primaryPath = 'ghost'; player.soulStability = 40
    applyPathTraining(player, 12, worldFixture())
    expect(player.soulStability).toBeGreaterThan(40)
  })

  it('prevents arbitrary primary-path switching', () => {
    const player = neutralPlayer(); expect(choosePrimaryPath(player, 'dao')).toBe(true)
    expect(choosePrimaryPath(player, 'sword')).toBe(false)
    expect(player.primaryPath).toBe('dao')
  })

  it('gives secondary paths less experience than the primary path', () => {
    const primary = neutralPlayer(); choosePrimaryPath(primary, 'dao')
    const secondary = neutralPlayer(); choosePrimaryPath(secondary, 'dao'); expect(addSecondaryPath(secondary, 'sword')).toBe(true)
    addPathExperience(primary, 'dao', 100)
    addPathExperience(secondary, 'sword', 100, true)
    expect(secondary.pathProgress.find((entry) => entry.pathId === 'sword')!.experience).toBeLessThan(primary.pathProgress[0].experience)
  })
})

describe('V3 lifespan rules', () => {
  it.each([
    ['凡人', 100], ['炼气', 130], ['筑基', 220], ['金丹', 500], ['元婴', 1000],
    ['化神', 2000], ['炼虚', 4000], ['合体', 8000], ['大乘', 15000], ['渡劫', 30000],
  ])('uses %s base lifespan of %i years', (group, years) => {
    const player = neutralPlayer(); player.realmIndex = realmIndex(group)
    expect(calculateMaxLifespanMonths(player) / 12).toBe(years)
  })

  it('does not add lifespan repeatedly for minor stages', () => {
    const player = neutralPlayer()
    const foundation = REALMS.map((realm, index) => ({ realm, index })).filter(({ realm }) => realm.group === '筑基')
    expect(calculateMaxLifespanMonths(player, foundation[0].index)).toBe(calculateMaxLifespanMonths(player, foundation[3].index))
  })

  it('extends lifespan at a major-realm breakthrough', () => {
    const player = neutralPlayer()
    expect(calculateMaxLifespanMonths(player, realmIndex('金丹'))).toBeGreaterThan(calculateMaxLifespanMonths(player, realmIndex('筑基')))
  })

  it('uses a smooth, bounded constitution modifier', () => {
    expect(constitutionLifespanModifier(90)).toBeGreaterThan(constitutionLifespanModifier(55))
    expect(constitutionLifespanModifier(200)).toBeLessThanOrEqual(.13)
  })

  it('applies longevity talent and body-cultivator lifespan bonuses', () => {
    const baseline = neutralPlayer(); baseline.realmIndex = realmIndex('炼气')
    const talented = neutralPlayer(); talented.realmIndex = realmIndex('炼气'); talented.talents = [instantiateTalent(talentById('longevity')!, 1)]
    const body = neutralPlayer(); body.realmIndex = realmIndex('炼气'); choosePrimaryPath(body, 'body')
    expect(calculateMaxLifespanMonths(talented)).toBeGreaterThan(calculateMaxLifespanMonths(baseline))
    expect(calculateMaxLifespanMonths(body)).toBeGreaterThan(calculateMaxLifespanMonths(baseline))
  })

  it('lets demonic blood rites trade lifespan for cultivation speed', () => {
    const player = neutralPlayer(); player.unlockedPaths.push('demonic'); choosePrimaryPath(player, 'demonic'); player.lifespanMonths = calculateMaxLifespanMonths(player)
    const before = player.lifespanMonths
    expect(burnLifespanForCultivation(player)).toBe(true)
    expect(player.lifespanMonths).toBe(before - 60)
    expect(player.pathResources.bloodRiteMonthsRemaining).toBe(120)
  })

  it('reports twilight warnings at 80, 90 and 97 percent', () => {
    const player = neutralPlayer(); player.lifespanMonths = 1000
    player.ageMonths = 800; expect(agingStage(player)).toBe('暮年')
    player.ageMonths = 900; expect(agingStage(player)).toBe('寿元无多')
    player.ageMonths = 970; expect(agingStage(player)).toBe('大限将至')
  })

  it('does not naturally kill ghost cultivators', () => {
    const player = neutralPlayer(); player.primaryPath = 'ghost'; player.ageMonths = 5000; player.lifespanMonths = 1000; player.soulStability = 50
    expect(isNaturalLifespanExpired(player)).toBe(false)
    expect(agingStage(player)).toBe('魂体')
  })
})
