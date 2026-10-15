import { describe, expect, it } from 'vitest'
import { canAttemptCraft, craftingChance, resolveCraft } from '../src/core/professions/crafting'
import { RandomService } from '../src/core/random/RandomService'
import { recipeById } from '../src/data/recipes'
import { playerFixture } from './fixtures'

describe('V7 cultivation professions', () => {
  it('rejects unknown recipes and insufficient materials without consuming anything', () => {
    const recipe = recipeById('make-qi-pill')!
    const unknown = playerFixture({ knownRecipes: [], inventory: [{ itemId: 'green-spirit-herb', quantity: 3 }] })
    expect(canAttemptCraft(unknown, recipe)).toMatchObject({ ok: false, reason: '尚未掌握此配方' })
    const poor = playerFixture({ knownRecipes: [recipe.id], inventory: [] })
    expect(resolveCraft(poor, recipe.id, new RandomService(() => 0))).toMatchObject({ success: false, materialsConsumed: [] })
  })

  it('successfully refines existing pill definitions and gains alchemy experience', () => {
    const player = playerFixture({ knownRecipes: ['make-qi-pill'], inventory: [{ itemId: 'green-spirit-herb', quantity: 6 }] })
    const result = resolveCraft(player, 'make-qi-pill', new RandomService(() => 0))
    expect(result).toMatchObject({ success: true, resultItemId: 'qi-pill', resultAmount: 3, qualityText: '完美炼制' })
    expect(player.inventory.find((entry) => entry.itemId === 'qi-pill')?.quantity).toBe(3)
    expect(player.professionProgress.find((entry) => entry.id === 'ALCHEMY')!.experience).toBeGreaterThan(0)
  })

  it('craft failure consumes only the severity-dependent material share', () => {
    const player = playerFixture({ knownRecipes: ['make-healing-pill'], inventory: [{ itemId: 'green-spirit-herb', quantity: 8 }, { itemId: 'beast-bone', quantity: 2 }] })
    const result = resolveCraft(player, 'make-healing-pill', new RandomService(() => .7))
    expect(result.success).toBe(false)
    expect(result.materialsConsumed.length).toBe(2)
    expect(result.materialsConsumed[0].amount).toBeLessThanOrEqual(4)
    expect(player.professionProgress.find((entry) => entry.id === 'ALCHEMY')!.totalActions).toBe(1)
  })

  it('mastery, comprehension, soul and the appropriate sect improve chance within bounds', () => {
    const recipe = recipeById('make-healing-pill')!
    const novice = playerFixture({ stats: { comprehension: 20, soul: 20, luck: 50, constitution: 50, charm: 50 } })
    const master = playerFixture({ stats: { comprehension: 90, soul: 90, luck: 50, constitution: 50, charm: 50 }, realmIndex: 20 })
    master.professionProgress.find((entry) => entry.id === 'ALCHEMY')!.level = 90
    expect(craftingChance(master, recipe, '丹宗')).toBeGreaterThan(craftingChance(novice, recipe))
    expect(craftingChance(master, recipe, '丹宗')).toBeLessThanOrEqual(.98)
  })

  it('refining produces the existing equipment item and records refining progress', () => {
    const player = playerFixture({ knownRecipes: ['forge-green-edge'], inventory: [{ itemId: 'black-iron', quantity: 3 }, { itemId: 'beast-bone', quantity: 2 }] })
    const result = resolveCraft(player, 'forge-green-edge', new RandomService(() => 0))
    expect(result.success).toBe(true)
    expect(result.resultItemId).toBe('green-edge-weapon')
    expect(player.inventory.some((entry) => entry.itemId === 'green-edge-weapon')).toBe(true)
    expect(player.professionProgress.find((entry) => entry.id === 'REFINING')!.successes).toBe(1)
  })
})
