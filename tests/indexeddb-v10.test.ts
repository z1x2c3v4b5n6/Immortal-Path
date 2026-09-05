import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { saveFixture } from './fixtures'

describe('V10 to V11 IndexedDB upgrade', () => {
  afterEach(async () => {
    const { SaveService } = await import('../src/core/save/SaveService')
    await SaveService.remove()
  })

  it('upgrades a V9 record and supplies all opportunity fields', async () => {
    const legacy = saveFixture()
    legacy.version = 10
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
    const world = legacy.world as unknown as Record<string, unknown>
    delete world.npcCultivators
    delete world.relationships
    delete world.sectRelations
    delete world.territories
    delete world.masterDisciples

    const oldDb = new Dexie('immortal-path-db')
    oldDb.version(10).stores({ saves: 'id,updatedAt' })
    await oldDb.table('saves').put(legacy)
    oldDb.close()

    const { SaveService } = await import('../src/core/save/SaveService')
    const restored = await SaveService.load()
    expect(restored?.version).toBe(11)
    expect(restored?.player).toMatchObject({ eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [] })
    expect(restored?.player).toMatchObject({ discipleIds: [], socialHistory: [] })
    expect(restored?.world.sects.length).toBeGreaterThan(0)
    expect(restored?.world.sectRelations.length).toBeGreaterThan(0)
    expect(restored?.world.territories.length).toBeGreaterThan(0)
    expect(restored?.world.npcCultivators.length).toBeGreaterThan(0)
  })
})
