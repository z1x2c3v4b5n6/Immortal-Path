import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../src/stores/game'
import { descendantFixture, playerFixture, saveFixture, worldFixture } from './fixtures'
import type { FamilyState, Player } from '../src/models'

function familyFor(player: Player): FamilyState {
  return { id: player.familyId, name: player.bloodline.familyName, founderId: player.id, foundedYear: 100, wealth: 0, inventory: [], reputation: 0, bloodline: player.bloodline, memberIds: [player.id], kind: '凡人家族', resources: 0, fame: 0, territory: '故乡村镇', history: [] }
}

function setupMortal() {
  const player = playerFixture({ spiritStones: 100, inventory: [{ itemId: 'herb', quantity: 4 }] })
  const family = familyFor(player)
  const world = worldFixture({ families: [family] })
  const game = useGameStore()
  game.replaceState(saveFixture({ player, world }))
  return { game, family: game.state.world.families[0] }
}

describe('V3 pending death and ghost conversion', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not duplicate stones or items when becoming a ghost', () => {
    const { game, family } = setupMortal()
    game.debug('death')
    expect(family.wealth).toBe(0)
    expect(family.inventory).toEqual([])
    expect(game.becomeGhost()).toBe(true)
    expect(game.player?.spiritStones).toBe(100)
    expect(game.player?.inventory).toEqual([{ itemId: 'herb', quantity: 4 }])
    expect(family.wealth).toBe(0)
    expect(family.inventory).toEqual([])
  })

  it('does not grant reincarnation points or create a final chronicle entry for ghost conversion', () => {
    const { game } = setupMortal()
    game.debug('death')
    expect(game.state.reincarnation.totalPoints).toBe(0)
    expect(game.state.lifeRecords).toHaveLength(0)
    game.becomeGhost()
    expect(game.state.reincarnation.totalPoints).toBe(0)
    expect(game.state.lifeRecords).toHaveLength(0)
    expect(game.player?.primaryPath).toBe('ghost')
    expect(game.player?.alive).toBe(true)
  })

  it('keeps a controlled descendant synchronized after death and ghost conversion', () => {
    const player = playerFixture({ id: 'child', entryType: 'bloodline' })
    const controlled = descendantFixture({ id: 'child', isPlayer: true, alive: true })
    const world = worldFixture({ descendants: [controlled], families: [familyFor(player)] })
    const game = useGameStore(); game.replaceState(saveFixture({ player, world }))
    game.debug('death')
    game.becomeGhost()
    const worldPerson = game.state.world.descendants.find((entry) => entry.id === 'child')
    expect(worldPerson).toMatchObject({ alive: true, isPlayer: true })
  })

  it('settles inheritance and chronicle exactly once only after choosing reincarnation', () => {
    const { game, family } = setupMortal()
    game.debug('death')
    expect(family.wealth).toBe(0)
    game.enterReincarnationHall()
    expect(family.wealth).toBe(50)
    expect(family.inventory).toEqual([{ itemId: 'herb', quantity: 2 }])
    expect(game.state.reincarnation.totalPoints).toBeGreaterThan(0)
    expect(game.state.lifeRecords).toHaveLength(1)
    game.enterReincarnationHall()
    expect(family.wealth).toBe(50)
    expect(family.inventory).toEqual([{ itemId: 'herb', quantity: 2 }])
    expect(game.state.lifeRecords).toHaveLength(1)
  })

  it('settles assets once when bloodline continuation is selected', () => {
    const player = playerFixture({ spiritStones: 100, inventory: [{ itemId: 'herb', quantity: 4 }] })
    const child = descendantFixture({ parents: [player.id], familyId: player.familyId })
    const family = familyFor(player); family.memberIds.push(child.id)
    const game = useGameStore(); game.replaceState(saveFixture({ player, world: worldFixture({ families: [family], descendants: [child] }) }))
    game.debug('death')
    game.continueAsDescendant(child.id)
    expect(game.state.lifeRecords).toHaveLength(1)
    expect(game.player?.id).toBe(child.id)
    expect(game.player?.inventory).toEqual([{ itemId: 'herb', quantity: 2 }])
    expect(game.state.world.families[0].inventory).toEqual([])
  })
})
