import { describe, expect, it } from 'vitest'
import { generateContinent, getWorldModifier, getWorldPathMultiplier } from '../src/core/world/world'
import { WORLD_ERAS, WORLD_TRAITS } from '../src/data/worldTraits'
import { worldFixture } from './fixtures'

describe('V3 seeded cultivation continent', () => {
  it('generates identical initial worlds from the same seed', () => {
    expect(generateContinent('XJ-82741935')).toEqual(generateContinent('XJ-82741935'))
  })

  it('generates different worlds from different seeds with overwhelming probability', () => {
    expect(generateContinent('XJ-82741935')).not.toEqual(generateContinent('TY-10293847'))
  })

  it('selects three to five mutually compatible traits', () => {
    for (const seed of ['AA-10000001', 'AA-10000002', 'AA-10000003', 'AA-10000004']) {
      const traits = generateContinent(seed).traits
      expect(traits.length).toBeGreaterThanOrEqual(3)
      expect(traits.length).toBeLessThanOrEqual(5)
      for (const trait of traits) expect(traits.some((other) => trait.incompatibleWith?.includes(other.id))).toBe(false)
    }
  })

  it('configures era modifiers in the intended order', () => {
    expect(WORLD_ERAS.DECLINING.qi).toBeLessThan(WORLD_ERAS.NORMAL.qi)
    expect(WORLD_ERAS.PROSPEROUS.qi).toBeGreaterThan(WORLD_ERAS.NORMAL.qi)
    expect(WORLD_ERAS.GOLDEN.heavenlyChance).toBeGreaterThan(WORLD_ERAS.PROSPEROUS.heavenlyChance)
  })

  it('normalizes path distribution to exactly one hundred percent', () => {
    const distribution = generateContinent('ST-55667788').pathDistribution
    expect(Object.values(distribution).reduce((sum, value) => sum + value, 0)).toBe(100)
    expect(Object.values(distribution).every((value) => value > 0)).toBe(true)
  })
})

describe('V3 world and path interaction', () => {
  it('makes Martial Prosperity improve body cultivation', () => {
    const world = worldFixture()
    world.continent.cultivationEnvironment.spiritualQiMultiplier = 1
    world.continent.traits = [structuredClone(WORLD_TRAITS.find((trait) => trait.id === 'martial')!)]
    expect(getWorldPathMultiplier(world, 'body')).toBe(1.2)
    expect(getWorldPathMultiplier(world, 'dao')).toBe(1)
  })

  it('makes Sword Age improve sword cultivation', () => {
    const world = worldFixture()
    world.continent.cultivationEnvironment.spiritualQiMultiplier = 1
    world.continent.traits = [structuredClone(WORLD_TRAITS.find((trait) => trait.id === 'sword-age')!)]
    expect(getWorldPathMultiplier(world, 'sword')).toBe(1.2)
  })

  it('makes Demonic Rise increase demonic event weight', () => {
    const world = worldFixture()
    world.continent.traits = [structuredClone(WORLD_TRAITS.find((trait) => trait.id === 'demonic-rise')!)]
    expect(getWorldModifier(world, 'pathEvent', 'demonic')).toBe(.45)
  })

  it('clamps extreme world cultivation multipliers', () => {
    const world = worldFixture()
    world.continent.cultivationEnvironment.spiritualQiMultiplier = 9
    world.continent.traits = [structuredClone(WORLD_TRAITS.find((trait) => trait.id === 'martial')!)]
    expect(getWorldPathMultiplier(world, 'body')).toBe(1.4)
  })
})
