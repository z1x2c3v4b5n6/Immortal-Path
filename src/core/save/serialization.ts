import type { GameSave } from '../../models'

export function serializeSave(save: GameSave) { return JSON.stringify(save, null, 2) }
export function deserializeSave(value: string): GameSave {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('world' in parsed)) throw new Error('这不是有效的《长生录》存档。')
  return parsed as GameSave
}
