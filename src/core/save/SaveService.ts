import Dexie, { type EntityTable } from 'dexie'
import type { GameSave } from '../../models'

class GameDatabase extends Dexie {
  saves!: EntityTable<GameSave, 'id'>
  constructor() {
    super('immortal-path-db')
    this.version(1).stores({ saves: 'id,updatedAt' })
  }
}

const db = new GameDatabase()

export const SaveService = {
  save: async (state: GameSave) => db.saves.put(structuredClone({ ...state, updatedAt: new Date().toISOString() })),
  load: async () => db.saves.get('main'),
  remove: async () => db.saves.delete('main'),
}
