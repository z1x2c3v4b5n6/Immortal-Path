import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { saveFixture } from './fixtures'

describe('V13 → V14 economy migration', () => {
  afterEach(async () => {
    const { SaveService } = await import('../src/core/save/SaveService')
    await SaveService.remove()
  })

  it('preserves every V6 growth system and initializes V7 state', () => {
    const legacy = saveFixture()
    legacy.version = 13
    legacy.player!.inventory = [{ itemId: 'foundation-pill', quantity: 2 }]
    legacy.player!.equipment.weapon = 'green-edge-weapon'
    legacy.player!.boundArtifact = { artifactId: 'void-treasure', bondedAtYear: 100, nourishment: 20, affinity: 2, formerOwners: [], totalNourishment: 20, legacyLevel: 0 }
    legacy.player!.pillToxicity = 24
    legacy.player!.knownRecipes = ['make-qi-pill', 'forge-green-edge']
    legacy.player!.secretRealmHistory = [{ secretRealmId: 'azure-ruins', year: 100, deepestDepth: 2, status: 'ESCAPED', rewards: [] }]
    const raw = legacy as unknown as Record<string, unknown>
    delete raw.economy; delete raw.market; delete raw.auction
    const rawPlayer = legacy.player as unknown as Record<string, unknown>
    delete rawPlayer.professionProgress; delete rawPlayer.tradeHistory; delete rawPlayer.auctionHistory

    const migrated = migrateSave(legacy)
    expect(migrated.version).toBe(14)
    expect(migrated.player).toMatchObject({ inventory: [{ itemId: 'foundation-pill', quantity: 2 }], pillToxicity: 24, knownRecipes: ['make-qi-pill', 'forge-green-edge'] })
    expect(migrated.player!.equipment.weapon).toBe('green-edge-weapon')
    expect(migrated.player!.boundArtifact?.artifactId).toBe('void-treasure')
    expect(migrated.player!.secretRealmHistory).toHaveLength(1)
    expect(migrated.player!.professionProgress.map((entry) => entry.id)).toEqual(['ALCHEMY', 'REFINING', 'COMMERCE'])
    expect(migrated.player!.tradeHistory).toEqual([])
    expect(migrated.player!.auctionHistory).toEqual([])
    expect(migrated.market.supplyDemand.length).toBeGreaterThan(0)
    expect(migrated.auction.status).toBe('CLOSED')
  })

  it('round-trips V14 JSON without losing economy, trade or auction history', () => {
    const save = saveFixture()
    save.economy.marketIndex = 1.2
    save.market.cycle = 4
    save.player!.tradeHistory.push({ id: 'trade', year: 100, itemId: 'qi-pill', quantity: 1, type: 'BUY', unitPrice: 50, totalPrice: 50, merchantType: '丹药商' })
    save.player!.auctionHistory.push({ id: 'auction', year: 100, itemId: 'void-treasure', quantity: 1, price: 800, winnerId: save.player!.id, status: 'SOLD', fee: 40 })
    const restored = deserializeSave(serializeSave(save))
    expect(restored.version).toBe(CURRENT_SAVE_VERSION)
    expect(restored.economy.marketIndex).toBe(1.2)
    expect(restored.market.cycle).toBe(4)
    expect(restored.player!.tradeHistory[0].id).toBe('trade')
    expect(restored.player!.auctionHistory[0].id).toBe('auction')
  })

  it('upgrades a V13 IndexedDB record to V14', async () => {
    const legacy = saveFixture(); legacy.version = 13
    const raw = legacy as unknown as Record<string, unknown>; delete raw.economy; delete raw.market; delete raw.auction
    const player = legacy.player as unknown as Record<string, unknown>; delete player.professionProgress; delete player.tradeHistory; delete player.auctionHistory
    const oldDb = new Dexie('immortal-path-db')
    oldDb.version(13).stores({ saves: 'id,updatedAt' })
    await oldDb.table('saves').put(legacy); oldDb.close()
    const { SaveService } = await import('../src/core/save/SaveService')
    const restored = await SaveService.load()
    expect(restored?.version).toBe(14)
    expect(restored?.player?.professionProgress).toHaveLength(3)
    expect(restored?.market.supplyDemand.length).toBeGreaterThan(0)
  })
})
