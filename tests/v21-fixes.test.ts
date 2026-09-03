import { describe, expect, it } from 'vitest'
import { calculateOutcomeWeight, selectEventOutcome } from '../src/core/events/outcomes'
import { RandomService } from '../src/core/random/RandomService'
import { transferInventory } from '../src/stores/game'
import { originById } from '../src/data/origins'
import type { EventOutcome } from '../src/models'
import { playerFixture } from './fixtures'

describe('V2.1 event outcomes', () => {
  const outcomes: EventOutcome[] = [
    { id: 'ordinary', weight: 80, effects: [], resultText: '无事发生。' },
    { id: 'rare', weight: 20, effects: [{ type: 'stones', value: 5, text: '获得灵石。' }], resultText: '发现机缘。', tags: ['rare', 'insight'] },
  ]

  it('selects one weighted outcome only after an option is chosen', () => {
    const player = playerFixture()
    expect(selectEventOutcome(outcomes, player, new RandomService(() => .99)).id).toBe('rare')
    expect(outcomes[1].resultText).not.toBe(outcomes[1].effects[0].text)
  })

  it('uses luck, soul, comprehension, talents and origin modifiers in outcome weights', () => {
    const base = playerFixture()
    const boosted = playerFixture()
    boosted.stats = { ...boosted.stats, luck: 90, soul: 90, comprehension: 90 }
    boosted.talents = [{ id: 'event', name: '福缘', quality: '普通', cost: 1, description: '', effects: [{ type: 'eventWeight', value: .2 }], firstGenerationAvailable: true, acquiredGeneration: 1 }]
    boosted.origin = originById('mystery')
    expect(calculateOutcomeWeight(outcomes[1], boosted)).toBeGreaterThan(calculateOutcomeWeight(outcomes[1], base))
  })

  it('applies hunter adventure safety to dangerous outcomes', () => {
    const danger: EventOutcome = { id: 'danger', weight: 10, effects: [], resultText: '受伤。', tags: ['danger'] }
    const farmer = playerFixture()
    const hunter = playerFixture(); hunter.origin = originById('hunter')
    expect(calculateOutcomeWeight(danger, hunter)).toBeLessThan(calculateOutcomeWeight(danger, farmer))
  })
})

describe('V2.1 family inheritance', () => {
  it('moves family inventory and consumes the source stacks', () => {
    const family = [{ itemId: 'herb', quantity: 2 }, { itemId: 'jade', quantity: 1 }]
    const heir = [{ itemId: 'herb', quantity: 1 }]
    transferInventory(family, heir)
    expect(family).toEqual([])
    expect(heir).toEqual([{ itemId: 'herb', quantity: 3 }, { itemId: 'jade', quantity: 1 }])
  })
})
