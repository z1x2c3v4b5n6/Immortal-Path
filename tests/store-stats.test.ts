import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { playerFixture } from './fixtures'

describe('unified in-game stat changes', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('records the reason and timeline for a positive change', () => {
    const game = useGameStore()
    game.state.player = playerFixture()
    game.modifyStat('luck', 3, '山中奇遇')
    expect(game.state.player.statHistory[0]).toMatchObject({ stat: 'luck', delta: 3, reason: '山中奇遇' })
    expect(game.state.logs[0].text).toContain('山中奇遇')
  })

  it('records a negative injury without crossing the lower bound', () => {
    const game = useGameStore()
    game.state.player = playerFixture()
    game.modifyStat('soul', -4, '神魂受创')
    expect(game.state.player.stats.soul).toBe(46)
    expect(game.state.player.statHistory[0].reason).toBe('神魂受创')
  })
})
