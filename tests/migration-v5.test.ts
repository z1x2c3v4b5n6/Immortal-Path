import { describe, expect, it } from 'vitest'
import { deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { saveFixture } from './fixtures'

function legacySave(version: number) {
  return {
    version,
    createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
    world: { currentYear: 321, currentMonth: 4, eraName: '玄历', worldEvents: [{ id: 'old-event', year: 300, text: '旧世留痕。' }], sects: [], npcs: [], descendants: [], families: [] },
    player: {
      id: `legacy-${version}`, name: '旧世修士', generation: 1, birthYear: 200, ageMonths: 600, lifespanMonths: 1200,
      realmIndex: 1, cultivation: 10, cultivationRequired: 200,
      spiritRoot: version < 4 ? { rank: 4, name: '水木双灵根', elements: ['水', '木'], multiplier: 1.2 } : { elements: ['水', '木'], quality: 'NORMAL', mutations: [], cultivationMultiplier: 1.1, specializationMultiplier: 1.22, breakthroughModifier: .025, statPointBonus: 5 },
      stats: { comprehension: 55, luck: 55, constitution: 55, soul: 55, charm: 55 }, talents: [], spiritStones: 10,
      origin: { id: 'farmer' }, inventory: [], achievements: [], timeline: [], alive: true,
    },
    lifeRecords: [], reincarnation: {}, settings: {}, pity: {}, logs: [], pendingEvent: null,
  }
}

describe('complete legacy migration chain', () => {
  it.each([1, 2, 3, 4, 5])('migrates V%i to V8 with stable world and path defaults', (version) => {
    const migrated = migrateSave(legacySave(version))
    expect(migrated.version).toBe(8)
    expect(migrated.world.seed).toMatch(/^LG-/)
    expect(migrated.world.continent.traits.length).toBeGreaterThanOrEqual(3)
    expect(migrated.player?.pathResources.maxQiBlood).toBe(100)
    expect(migrated.player?.unlockedPaths).toEqual(['dao', 'sword', 'body'])
    expect(migrated.player?.lifespanFateModifier).toBe(0)
  })

  it('derives the same legacy seed and continent on repeated migrations', () => {
    const first = migrateSave(legacySave(4))
    const second = migrateSave(legacySave(4))
    expect(first.world.seed).toBe(second.world.seed)
    expect(first.world.continent).toEqual(second.world.continent)
  })

  it('round-trips a current JSON save with world and path state intact', () => {
    const save = saveFixture()
    save.player!.primaryPath = 'sword'
    save.player!.pathProgress = [{ pathId: 'sword', experience: 240, level: 2 }]
    save.player!.pathResources.swordIntent = 88
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(8)
    expect(restored.world.seed).toBe(save.world.seed)
    expect(restored.world.continent).toEqual(save.world.continent)
    expect(restored.player?.primaryPath).toBe('sword')
    expect(restored.player?.pathResources.swordIntent).toBe(88)
  })
})
