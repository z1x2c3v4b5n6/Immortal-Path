import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { saveFixture } from './fixtures'
import { CURRENT_SAVE_VERSION } from '../src/core/save/serialization'

describe('V11 to V12 IndexedDB upgrade', () => {
  afterEach(async () => {
    const { SaveService } = await import('../src/core/save/SaveService')
    await SaveService.remove()
  })

  it('upgrades a V11 record and supplies all combat fields', async () => {
    const legacy = saveFixture()
    legacy.version = 11
    const player = legacy.player! as unknown as Record<string, unknown>
    delete player.eventRiskHistory
    delete player.deathCause
    delete player.dangerRecords
    delete player.majorOpportunities
    delete player.inheritanceHistory
    delete player.sectMembership
    delete player.masterId
    delete player.discipleIds
    delete player.socialHistory
    delete player.combatPower
    delete player.combatHistory
    delete player.battleAchievements
    delete player.equippedArtifacts
    delete player.battleCards
    delete player.battleStats
    const world = legacy.world as unknown as Record<string, unknown>
    delete world.npcCultivators
    delete world.relationships
    delete world.sectRelations
    delete world.territories
    delete world.masterDisciples

    const oldDb = new Dexie('immortal-path-db')
    oldDb.version(11).stores({ saves: 'id,updatedAt' })
    await oldDb.table('saves').put(legacy)
    oldDb.close()

    const { SaveService } = await import('../src/core/save/SaveService')
    const restored = await SaveService.load()
    expect(restored?.version).toBe(CURRENT_SAVE_VERSION)
    expect(restored?.player).toMatchObject({ eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [] })
    expect(restored?.player).toMatchObject({ discipleIds: [], socialHistory: [] })
    expect(restored?.player).toMatchObject({ combatHistory: [], battleAchievements: [], equippedArtifacts: [], battleCards: [] })
    expect(restored?.player?.combatPower).toBeGreaterThan(0)
    expect(restored?.player?.battleStats).toMatchObject({ battles: 0, wins: 0, losses: 0 })
    expect(restored?.world.sects.length).toBeGreaterThan(0)
    expect(restored?.world.sectRelations.length).toBeGreaterThan(0)
    expect(restored?.world.territories.length).toBeGreaterThan(0)
    expect(restored?.world.npcCultivators.length).toBeGreaterThan(0)
  })
})
