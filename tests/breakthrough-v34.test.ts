import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough, majorBreakthroughBaseChance } from '../src/core/breakthrough/breakthrough'
import { REALMS } from '../src/data/realms'
import { CharacterState } from '../src/models'
import { useGameStore } from '../src/stores/game'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

describe('V3.4 breakthrough rules', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('allows an attempt as soon as cultivation is full', () => {
    const player = playerFixture({ cultivation: 255, cultivationRequired: 255, breakthroughProgress: 0, knownTechniques: [], activeTechnique: undefined })
    player.resources = { spiritHerbs: 0, beastCores: 0, bodyMaterials: 0, soulCrystals: 0 }
    player.characterStates = [CharacterState.SERIOUS_INJURY]
    expect(canBreakthrough(player)).toBe(true)
  })

  it('keeps minor breakthroughs in the 90–99% band and records success or failure', () => {
    const successGame = useGameStore()
    successGame.replaceState(saveFixture({ player: playerFixture({ cultivation: 255, cultivationRequired: 255 }) }))
    successGame.breakthrough({ forceSuccess: true })
    expect(successGame.player!.realmIndex).toBe(2)
    expect(successGame.player!.breakthroughHistory[0].success).toBe(true)

    setActivePinia(createPinia())
    const failureGame = useGameStore()
    failureGame.replaceState(saveFixture({ player: playerFixture({ cultivation: 255, cultivationRequired: 255 }) }))
    failureGame.breakthrough({ forceSuccess: false })
    expect(failureGame.player!.realmIndex).toBe(1)
    expect(failureGame.player!.characterStates).toContain(CharacterState.BOTTLENECK)
    expect(failureGame.player!.characterStates).not.toContain(CharacterState.SERIOUS_INJURY)
  })

  it('uses descending major-realm base chances', () => {
    expect(majorBreakthroughBaseChance('筑基')).toBe(.60)
    expect(majorBreakthroughBaseChance('金丹')).toBe(.45)
    expect(majorBreakthroughBaseChance('元婴')).toBe(.35)
  })

  it('treats preparation and a foundation pill as optional probability bonuses', () => {
    const base = playerFixture({ realmIndex: 10, cultivation: REALMS[10].cultivationRequired, cultivationRequired: REALMS[10].cultivationRequired, breakthroughProgress: 0 })
    const prepared = playerFixture({ ...base, breakthroughProgress: 100, inventory: [{ itemId: 'foundation-pill', quantity: 1 }] })
    const withoutAid = calculateBreakthroughChance(base, worldFixture())
    const withAid = calculateBreakthroughChance(prepared, worldFixture(), { useAuxiliaries: true })
    expect(withAid.preparation).toBe(.1)
    expect(withAid.auxiliary).toBeGreaterThanOrEqual(.2)
    expect(withAid.final).toBeGreaterThan(withoutAid.final)
  })

  it('applies distinct path factors', () => {
    const common = { realmIndex: 10, cultivation: REALMS[10].cultivationRequired, cultivationRequired: REALMS[10].cultivationRequired }
    const dao = playerFixture({ ...common, primaryPath: 'dao' })
    const sword = playerFixture({ ...common, primaryPath: 'sword' }); sword.pathResources.swordIntent = 100
    const body = playerFixture({ ...common, primaryPath: 'body', stats: { ...playerFixture().stats, constitution: 90 } })
    const ghost = playerFixture({ ...common, primaryPath: 'ghost', soulStability: 90, stats: { ...playerFixture().stats, soul: 90 } })
    const demonic = playerFixture({ ...common, primaryPath: 'demonic' }); demonic.pathResources.demonicNature = 80
    const values = [dao, sword, body, ghost, demonic].map((player) => calculateBreakthroughChance(player, worldFixture()).path)
    expect(new Set(values).size).toBeGreaterThan(2)
  })

  it('records a major failure in the life timeline', () => {
    const player = playerFixture({ realmIndex: 10, cultivation: REALMS[10].cultivationRequired, cultivationRequired: REALMS[10].cultivationRequired })
    const game = useGameStore(); game.replaceState(saveFixture({ player }))
    game.breakthrough({ forceSuccess: false })
    expect(game.player!.breakthroughHistory[0]).toMatchObject({ success: false, toRealm: REALMS[11].name })
    expect(game.player!.importantEvents.some((entry) => entry.text.includes('突破筑基失败'))).toBe(true)
  })
})
