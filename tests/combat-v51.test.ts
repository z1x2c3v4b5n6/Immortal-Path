import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { combatDisplayAssessment, combatVisualProfile, enemyVisualType, playbackRounds } from '../src/core/combat/combatPresentation'
import { SaveService } from '../src/core/save/SaveService'
import { CURRENT_SAVE_VERSION, deserializeSave, serializeSave } from '../src/core/save/serialization'
import { router } from '../src/router'
import { useGameStore } from '../src/stores/game'
import { CharacterState, CombatStrategy, type CombatContext, type CombatRound } from '../src/models'
import { saveFixture } from './fixtures'

const adventureContext: CombatContext = {
  sourceType: 'ADVENTURE', sourceId: 'qingyun', location: '青云山脉', riskLevel: 2, mode: 'overlay', returnState: { label: '继续历练' },
}

describe('V5.1 embedded combat context and continuation', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(async () => SaveService.remove())

  it('keeps the adventure route and context throughout an encounter', async () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    await router.push('/adventure')
    expect(game.startCombat('beast', 0, 'adventure', '青云山脉', undefined, adventureContext)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/adventure')
    expect(game.pendingCombat?.context).toEqual(adventureContext)
    const result = game.resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'victory')!
    expect(router.currentRoute.value.path).toBe('/adventure')
    expect(result.context).toEqual(adventureContext)
    expect(game.pendingCombat).toBeUndefined()
  })

  it('continues a LifeEvent after victory and applies its deferred effects', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.triggerLifeEvent('rogue-cultivator-ambush')
    game.chooseLifeEvent('fight')
    expect(game.pendingCombat?.context).toMatchObject({ sourceType: 'LIFE_EVENT', sourceId: 'rogue-cultivator-ambush', eventChoiceId: 'fight' })
    expect(game.player?.fateTags.some((entry) => entry.id === 'KILLED_DISCIPLE')).toBe(false)
    game.resolvePendingCombat(CombatStrategy.CAUTIOUS, undefined, 'victory')
    expect(game.player?.fateTags.some((entry) => entry.id === 'KILLED_DISCIPLE')).toBe(true)
    expect(game.ready.eventResultText).toContain('劫修')
  })

  it('keeps sect sparring safe and tagged as an NPC duel', async () => {
    const save = saveFixture()
    const npc = save.world.npcCultivators[0]
    const game = useGameStore(); game.replaceState(save)
    await router.push('/sect')
    expect(game.startNPCCombat(npc.id, 'sect')).toBe(true)
    expect(game.pendingCombat?.context).toMatchObject({ sourceType: 'NPC_DUEL', location: '宗门演武台' })
    const result = game.resolvePendingCombat(CombatStrategy.DESPERATE, undefined, 'death')!
    expect(result.outcome).toBe('defeat')
    expect(game.player?.alive).toBe(true)
    expect(router.currentRoute.value.path).toBe('/sect')
  })

  it('records rewards, experience, health and injury feedback in combat history', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.startCombat('beast', 0, 'adventure', '青云山脉', undefined, adventureContext)
    const victory = game.resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'victory')!
    expect(victory.playerHealthMax).toBeGreaterThan(0)
    expect(victory.enemyHealthRemaining).toBe(0)
    expect(victory.experienceGained).toBeGreaterThan(0)
    expect(victory.loot).toEqual(expect.arrayContaining([expect.objectContaining({ name: '灵石' }), expect.objectContaining({ name: '战斗经验' })]))
    expect(game.player?.combatHistory[0]).toEqual(victory)
  })

  it('applies serious injury on a high-power defeat', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.startCombat('cultivator', 2, 'adventure', '荒野', undefined, adventureContext)
    game.state.pendingCombat!.enemy.combatPower = (game.combatPower?.total ?? 100) * 2
    const result = game.resolvePendingCombat(CombatStrategy.AGGRESSIVE, undefined, 'defeat')!
    expect(result.injury).toBe('serious')
    expect(game.player?.characterStates).toContain(CharacterState.SERIOUS_INJURY)
  })

  it('uses the unified death flow and keeps ghost conversion settlement rules', () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.startCombat('cultivator', 2, 'adventure', '黑风山', undefined, { ...adventureContext, riskLevel: 4 })
    const result = game.resolvePendingCombat(CombatStrategy.DESPERATE, undefined, 'death')!
    expect(result.injury).toBe('death')
    expect(game.player).toMatchObject({ alive: false, deathFinalized: false })
    expect(game.player?.deathCause?.category).toBe('combat')
    expect(game.state.lifeRecords).toHaveLength(0)
    expect(game.becomeGhost()).toBe(true)
    expect(game.state.lifeRecords).toHaveLength(0)
    expect(game.state.reincarnation.totalPoints).toBe(0)
  })

  it('keeps the independent CombatView route usable', async () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    await router.push('/combat')
    expect(game.startCombat('beast', 0, 'debug', '演武场')).toBe(true)
    expect(router.currentRoute.value.path).toBe('/combat')
    expect(game.pendingCombat?.context?.sourceType).toBe('DEBUG')
  })
})

describe('V5.1 battle presentation', () => {
  it('gives all five paths distinct visual profiles', () => {
    const profiles = (['dao', 'sword', 'body', 'demonic', 'ghost'] as const).map(combatVisualProfile)
    expect(new Set(profiles.map((entry) => entry.className)).size).toBe(5)
    expect(new Set(profiles.map((entry) => entry.motion)).size).toBe(5)
  })

  it('supports wolf, rogue, ordinary cultivator, demonic and ghost visuals', () => {
    const base = saveFixture().player!
    const pending = (name: string, type: 'beast' | 'cultivator', path: typeof base.primaryPath) => ({
      id: name, name, type, path: path ?? 'dao', realmIndex: 1, elements: ['木'] as Array<'木'>, combatPower: 100, attack: 10, defense: 10, health: 100, description: '', recommendedRealmIndex: 1, rewardStones: 1,
    })
    expect(enemyVisualType(pending('赤目妖狼', 'beast', 'body'))).toBe('wolf')
    expect(enemyVisualType(pending('黑风劫修', 'cultivator', 'dao'))).toBe('rogue')
    expect(enemyVisualType(pending('藏锋散人', 'cultivator', 'dao'))).toBe('cultivator')
    expect(enemyVisualType(pending('血衣道人', 'cultivator', 'demonic'))).toBe('demonic')
    expect(enemyVisualType(pending('无声鬼物', 'cultivator', 'ghost'))).toBe('ghost')
  })

  it('can skip playback without losing any combat round', () => {
    const rounds: CombatRound[] = [
      { round: 1, actor: 'player', text: '出剑。', damage: 10, playerHealth: 100, enemyHealth: 90 },
      { round: 1, actor: 'enemy', text: '反击。', damage: 8, playerHealth: 92, enemyHealth: 90 },
    ]
    expect(playbackRounds(rounds, 1)).toHaveLength(1)
    expect(playbackRounds(rounds, 0, true)).toEqual(rounds)
    expect(combatDisplayAssessment('强敌').label).toBe('强敌')
  })

  it('round-trips V5.1 context and presentation metadata through JSON and IndexedDB', async () => {
    const game = useGameStore(); game.replaceState(saveFixture())
    game.startCombat('beast', 0, 'adventure', '青云山脉', undefined, adventureContext)
    const result = game.resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'victory')!
    const restored = deserializeSave(serializeSave(game.state))
    expect(restored.version).toBe(CURRENT_SAVE_VERSION)
    expect(restored.player?.combatHistory[0]).toMatchObject({ id: result.id, context: adventureContext, injury: result.injury })
    await SaveService.save(game.state)
    const indexed = await SaveService.load()
    expect(indexed?.player?.combatHistory[0].context).toEqual(adventureContext)
    expect(indexed?.player?.combatHistory[0].loot).toEqual(result.loot)
  })
})
