import Dexie, { type EntityTable } from 'dexie'
import type { GameSave } from '../../models'
import { migrateSave } from './serialization'

class GameDatabase extends Dexie {
  saves!: EntityTable<GameSave, 'id'>
  constructor() {
    super('immortal-path-db')
    this.version(1).stores({ saves: 'id,updatedAt' })
    this.version(2).stores({ saves: 'id,updatedAt' }).upgrade((transaction) => transaction.table('saves').toCollection().modify((save: unknown) => Object.assign(save as object, migrateSave(save))))
    this.version(3).stores({ saves: 'id,updatedAt' }).upgrade((transaction) => transaction.table('saves').toCollection().modify((save: unknown) => Object.assign(save as object, migrateSave(save))))
  }
}

const db = new GameDatabase()

export const SaveService = {
  save: async (state: GameSave) => {
    const snapshot = JSON.parse(JSON.stringify({ ...state, version: 3, updatedAt: new Date().toISOString() })) as GameSave
    return db.saves.put(snapshot)
  },
  load: async () => {
    const save = await db.saves.get('main')
    return save ? migrateSave(save) : undefined
  },
  remove: async () => db.saves.delete('main'),
}
