import { describe, expect, it } from 'vitest'
import { migrateSave } from '../src/core/save/serialization'

describe('V1 to V2 migration', () => {
  it('keeps the old player, world history and refunds legacy upgrades', () => {
    const migrated = migrateSave({
      version: 1, createdAt: 'old', updatedAt: 'old',
      world: { currentYear: 429, currentMonth: 3, eraName: '玄历', worldEvents: [{ id: 'e', year: 228, text: '血魔宗覆灭。' }], sects: [], npcs: [] },
      player: { id: 'yang', name: '杨玄', generation: 1, birthYear: 102, ageMonths: 3924, lifespanMonths: 4000, realmIndex: 14, cultivation: 100, cultivationRequired: 5000, spiritRoot: { id: 'dual', name: '双灵根', rank: 4, multiplier: 1.2, elements: ['水', '木'] }, stats: { comprehension: 60, luck: 60, constitution: 60, soul: 60, charm: 60 }, spiritStones: 20, inventory: [], talents: [{ id: 'longevity', name: '长寿', description: '旧天赋', lifespanYears: 24 }], origin: { id: 'farmer' }, alive: true, achievements: [], timeline: [] },
      lifeRecords: [], reincarnation: { totalPoints: 10, upgrades: { comprehensionBonus: 2, luckBonus: 1, constitutionBonus: 0, spiritRootLuck: 1 } }, settings: { fortunateMode: true, autoSave: true, logLimit: 120 }, pity: { rollsWithoutRare: 2, rollsWithoutEpic: 3 }, logs: [], pendingEvent: null,
    })
    expect(migrated.version).toBe(4)
    expect(migrated.player?.name).toBe('杨玄')
    expect(migrated.player?.origin.baseStats).toBeDefined()
    expect(migrated.player?.talents[0].quality).toBe('普通')
    expect(migrated.player?.statPotential.constitution).toBeGreaterThanOrEqual(60)
    expect(migrated.player?.spiritRoot.statPointBonus).toBe(5)
    expect(migrated.world.worldEvents).toHaveLength(1)
    expect(migrated.world.families).toHaveLength(1)
    expect(migrated.reincarnation.totalPoints).toBe(130)
  })
})
