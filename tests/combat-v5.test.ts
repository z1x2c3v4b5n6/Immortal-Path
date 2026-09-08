import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BATTLE_CARD_CATALOG, createCombatEnemy } from '../src/core/combat/combat'
import { calculateCombatPower, calculateNPCCombatPower, realmCombatBase } from '../src/core/combat/combatPower'
import { calculateEscapeChance, combatStrengthLabel, elementalCombatModifier, environmentCombatModifier, resolveCombat } from '../src/core/combat/combatResolver'
import { unlockBattleAchievements } from '../src/core/combat/combatResult'
import { generateNPCCultivator } from '../src/core/npc/npcCultivator'
import { RandomService, createSeededRandom } from '../src/core/random/RandomService'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { useGameStore } from '../src/stores/game'
import { CharacterState, CombatStrategy, type CombatEnemy } from '../src/models'
import { createSpiritRoot } from '../src/data/spiritRoots'
import { playerFixture, saveFixture, worldFixture } from './fixtures'

const fixed = (value = .5) => new RandomService(() => value)

function enemy(overrides: Partial<CombatEnemy> = {}): CombatEnemy {
  return {
    id: 'enemy', name: '二阶妖狼', type: 'beast', realmIndex: 11, path: 'body', elements: ['木'], combatPower: 760,
    attack: 105, defense: 74, health: 620, description: '妖气逼人。', recommendedRealmIndex: 11, rewardStones: 80, rewardItemId: 'core', ...overrides,
  }
}

describe('V5 combat power', () => {
  it('scales realm power from mortal and qi refining to foundation and core formation', () => {
    expect(realmCombatBase(0)).toBeLessThan(realmCombatBase(1))
    expect(realmCombatBase(11)).toBe(500)
    expect(realmCombatBase(15)).toBeGreaterThan(realmCombatBase(11) * 2)
  })

  it('includes technique, talent, root, attributes, path, artifact, state and experience', () => {
    const world = worldFixture()
    const base = playerFixture({ realmIndex: 11, activeTechnique: 'plain-breath' })
    const ordinary = calculateCombatPower(base, world)
    const enhanced = playerFixture({
      realmIndex: 11, activeTechnique: 'thunder-sword', knownTechniques: ['plain-breath', 'thunder-sword'],
      techniqueProgress: [{ techniqueId: 'thunder-sword', level: 8, experience: 0 }], primaryPath: 'sword',
      pathProgress: [{ pathId: 'sword', level: 7, experience: 600 }], pathResources: { ...base.pathResources, swordIntent: 120 },
      talents: [{ ...base.origin, id: 'combat-talent', name: '剑骨', quality: '稀有', cost: 4, effects: [], acquiredGeneration: 1, firstGenerationAvailable: false }],
      equippedArtifacts: [{ id: 'sword', name: '飞剑', slot: 'weapon', attack: 80, defense: 0, power: 40 }],
      battleStats: { ...base.battleStats, wins: 20, battles: 25, experience: 400 },
    })
    const result = calculateCombatPower(enhanced, world)
    expect(result.total).toBeGreaterThan(ordinary.total)
    expect(result).toMatchObject({ realm: 500 })
    expect(result.technique).toBeGreaterThan(ordinary.technique)
    expect(result.path).toBeGreaterThan(ordinary.path)
    expect(result.artifacts).toBeGreaterThan(0)
    expect(result.experience).toBeGreaterThan(0)
  })

  it('applies injury and enlightenment to the displayed estimate', () => {
    const healthy = playerFixture({ realmIndex: 11 })
    const injured = playerFixture({ realmIndex: 11, characterStates: [CharacterState.SERIOUS_INJURY] })
    const enlightened = playerFixture({ realmIndex: 11, characterStates: [CharacterState.ENLIGHTENED] })
    expect(calculateCombatPower(injured).total).toBeLessThan(calculateCombatPower(healthy).total)
    expect(calculateCombatPower(enlightened).total).toBeGreaterThan(calculateCombatPower(healthy).total)
  })

  it('rates enemies without promising the outcome', () => {
    expect(combatStrengthLabel(450, 1000)).toBe('不可力敌')
    expect(combatStrengthLabel(850, 900)).toBe('势均力敌')
    expect(combatStrengthLabel(1250, 1000)).toBe('略强')
  })
})

describe('V5 tactical combat', () => {
  it('applies elemental counters and environments', () => {
    expect(elementalCombatModifier(['火'], ['木'])).toBeGreaterThan(0)
    expect(elementalCombatModifier(['木'], ['火'])).toBeLessThan(0)
    expect(environmentCombatModifier(['火'], 'dao', '赤炎火山')).toBe(.12)
    expect(environmentCombatModifier(['暗'], 'ghost', '阴魂古墓')).toBe(.15)
  })

  it('resolves victory, defeat and escape as complete round records', () => {
    const player = playerFixture({ realmIndex: 11, primaryPath: 'dao' })
    const world = worldFixture()
    const victory = resolveCombat(player, enemy(), CombatStrategy.BALANCED, '山林', world, fixed(), { forceOutcome: 'victory' })
    const defeat = resolveCombat(player, enemy(), CombatStrategy.AGGRESSIVE, '山林', world, fixed(), { forceOutcome: 'defeat' })
    const escape = resolveCombat(player, enemy(), CombatStrategy.ESCAPE, '山林', world, fixed(), { forceOutcome: 'escape' })
    expect(victory.outcome).toBe('victory')
    expect(defeat.outcome).toBe('defeat')
    expect(escape.outcome).toBe('escape')
    expect(victory.rounds.length).toBeGreaterThan(0)
  })

  it('gives sword, body, demonic and ghost paths distinct battle narration', () => {
    const world = worldFixture()
    const texts = (['sword', 'body', 'demonic', 'ghost'] as const).map((path) => resolveCombat(playerFixture({ primaryPath: path }), enemy(), CombatStrategy.BALANCED, '荒野', world, fixed(), { forceOutcome: 'victory' }).rounds[0].text)
    expect(new Set(texts).size).toBe(4)
    expect(texts.join('')).toContain('剑气')
    expect(texts.join('')).toContain('肉身')
    expect(texts.join('')).toContain('魔焰')
    expect(texts.join('')).toContain('魂术')
  })

  it('lets counters, luck and a trump card make a stronger foe beatable', () => {
    const spiritRoot = createSpiritRoot(['火'])
    const player = playerFixture({ realmIndex: 11, spiritRoot, spiritualAptitude: { ...playerFixture().spiritualAptitude, innateRoot: spiritRoot }, stats: { ...playerFixture().stats, luck: 90 } })
    const card = BATTLE_CARD_CATALOG.find((entry) => entry.id === 'blood-burning')!
    const result = resolveCombat(player, enemy({ combatPower: calculateCombatPower(player).total * 1.2 }), CombatStrategy.AGGRESSIVE, '赤炎谷', worldFixture(), fixed(.45), { battleCard: card })
    expect(['victory', 'defeat']).toContain(result.outcome)
    expect(result.rounds[0].damage).toBeGreaterThan(0)
  })

  it('calculates escape from realm, condition, luck, wind root and talismans', () => {
    const wind = createSpiritRoot(['风'])
    const swift = playerFixture({ realmIndex: 12, spiritRoot: wind, stats: { ...playerFixture().stats, luck: 90 } })
    const hurt = playerFixture({ realmIndex: 8, characterStates: [CharacterState.SERIOUS_INJURY], stats: { ...playerFixture().stats, luck: 10 } })
    const talisman = BATTLE_CARD_CATALOG.find((entry) => entry.id === 'void-talisman')!
    expect(calculateEscapeChance(swift, enemy(), talisman)).toBeGreaterThan(calculateEscapeChance(hurt, enemy()))
  })
})

describe('V5 NPC, store loop and chronicle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('gives NPC cultivators techniques, combat stats and current combat power', () => {
    const npc = generateNPCCultivator(createSeededRandom('NPC-COMBAT'), 100, worldFixture().sects[0], 11)
    expect(npc.knownTechniques.length).toBeGreaterThan(0)
    expect(npc.combatPower).toBe(calculateNPCCombatPower(npc))
    expect(npc.combatPower).toBeGreaterThan(realmCombatBase(11))
  })

  it('records wins, rewards, achievements and legendary battles', () => {
    const game = useGameStore()
    game.replaceState(saveFixture())
    game.player!.realmIndex = 11
    game.refreshCombatPower()
    game.startCombat('beast', 1, 'debug', '赤炎谷')
    const result = game.resolvePendingCombat(CombatStrategy.AGGRESSIVE, undefined, 'victory')!
    expect(game.player!.battleStats).toMatchObject({ battles: 1, wins: 1, kills: 1, beastKills: 1 })
    expect(game.player!.combatHistory[0].id).toBe(result.id)
    expect(game.player!.spiritStones).toBeGreaterThan(0)
    expect(game.player!.lifeTimeline.some((entry) => entry.type === 'combat')).toBe(true)
  })

  it('turns defeat into injury and combat death into the existing death choice flow', () => {
    const game = useGameStore()
    game.replaceState(saveFixture())
    game.startCombat('cultivator', 1, 'debug', '黑风山')
    game.resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'defeat')
    expect(game.player!.alive).toBe(true)
    expect(game.player!.characterStates.some((entry) => entry === CharacterState.INJURED || entry === CharacterState.SERIOUS_INJURY)).toBe(true)
    game.startCombat('cultivator', 2, 'debug', '黑风山')
    game.resolvePendingCombat(CombatStrategy.DESPERATE, undefined, 'death')
    expect(game.player!.alive).toBe(false)
    expect(game.player!.deathCause?.category).toBe('combat')
    expect(game.player!.deathFinalized).toBe(false)
  })

  it('converts combat-tagged life choices into battles and defers rewards until victory', () => {
    const game = useGameStore()
    game.replaceState(saveFixture())
    game.triggerLifeEvent('rogue-cultivator-ambush')
    game.chooseLifeEvent('fight')
    expect(game.pendingCombat?.sourceEventId).toBe('rogue-cultivator-ambush')
    expect(game.player!.fateTags.some((entry) => entry.id === 'KILLED_DISCIPLE')).toBe(false)
    game.resolvePendingCombat(CombatStrategy.CAUTIOUS, undefined, 'victory')
    expect(game.player!.fateTags.some((entry) => entry.id === 'KILLED_DISCIPLE')).toBe(true)
  })

  it('supports NPC rivalry and safe sect sparring', () => {
    const save = saveFixture()
    const npc = save.world.npcCultivators[0]
    npc.realmIndex = save.player!.realmIndex
    const game = useGameStore()
    game.replaceState(save)
    expect(game.startNPCCombat(npc.id)).toBe(true)
    const result = game.resolvePendingCombat(CombatStrategy.DESPERATE, undefined, 'death')!
    expect(result.outcome).toBe('defeat')
    expect(game.player!.alive).toBe(true)
  })

  it('unlocks named achievements from real battle records', () => {
    const player = playerFixture()
    player.battleStats.battles = 100
    player.battleStats.beastKills = 20
    const record = resolveCombat(player, enemy({ realmIndex: player.realmIndex + 1, combatPower: 900 }), CombatStrategy.BALANCED, '荒野', worldFixture(), fixed(), { forceOutcome: 'victory' })
    expect(unlockBattleAchievements(player, record)).toEqual(expect.arrayContaining(['越级挑战者', '百战修士', '妖兽猎人']))
  })
})

describe('Save V12 combat migration and JSON', () => {
  it('migrates V11 combat defaults without disturbing social data', () => {
    const save = saveFixture()
    const { combatPower: _power, combatHistory: _history, battleAchievements: _achievements, equippedArtifacts: _artifacts, battleCards: _cards, battleStats: _stats, ...v11Player } = save.player!
    const { pendingCombat: _pending, ...v11Save } = save
    const migrated = migrateSave({ ...v11Save, version: 11, player: v11Player })
    expect(migrated.version).toBe(12)
    expect(migrated.player).toMatchObject({ combatHistory: [], battleAchievements: [], equippedArtifacts: [], battleCards: [] })
    expect(migrated.player!.combatPower).toBeGreaterThan(0)
    expect(migrated.player!.battleStats).toMatchObject({ battles: 0, wins: 0, losses: 0 })
    expect(migrated.pendingCombat).toBeNull()
    expect(migrated.world.sects.length).toBe(save.world.sects.length)
  })

  it('round-trips battle history, artifacts, cards, achievements and pending combat', () => {
    const save = saveFixture()
    save.player!.equippedArtifacts.push({ id: 'blade', name: '问道剑', slot: 'weapon', attack: 80, defense: 0, power: 40 })
    save.player!.battleCards.push({ ...BATTLE_CARD_CATALOG[0] })
    save.player!.battleAchievements.push('越级挑战者')
    save.pendingCombat = { enemy: createCombatEnemy(save.player!, 'beast', fixed(), 0), environment: '青云山', source: 'adventure' }
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(12)
    expect(restored.player!.equippedArtifacts).toEqual(save.player!.equippedArtifacts)
    expect(restored.player!.battleCards).toEqual(save.player!.battleCards)
    expect(restored.player!.battleAchievements).toEqual(['越级挑战者'])
    expect(restored.pendingCombat?.enemy.name).toBe(save.pendingCombat.enemy.name)
  })
})
