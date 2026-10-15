import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, deserializeSave, migrateSave, serializeSave } from '../src/core/save/serialization'
import { saveFixture } from './fixtures'

describe('V12 → V13 migration', () => {
  it('preserves existing data and supplies V6 defaults', () => {
    const legacy = saveFixture()
    legacy.version = 12
    legacy.player!.inventory = [{ itemId: 'qi-pill', quantity: 3 }]
    legacy.player!.combatHistory = []
    const migrated = migrateSave(legacy)
    expect(migrated.version).toBe(CURRENT_SAVE_VERSION)
    expect(migrated.player!.inventory).toEqual(legacy.player!.inventory)
    expect(migrated.player!.equipment.artifactSlots).toEqual([])
    expect(migrated.player!.pillToxicity).toBe(0)
    expect(migrated.player!.secretRealmStates.length).toBeGreaterThan(0)
    expect(deserializeSave(serializeSave(migrated)).version).toBe(CURRENT_SAVE_VERSION)
  })
})
