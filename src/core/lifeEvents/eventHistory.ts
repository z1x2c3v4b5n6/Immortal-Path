import type { FateTag, LifeEventRecord, LifeTimelineEntry, Player } from '../../models'

export function addFateTag(player: Player, tag: FateTag) {
  if (player.fateTags.some((entry) => entry.id === tag.id)) return false
  player.fateTags.push(tag)
  return true
}

export function removeFateTag(player: Player, id: string) {
  const before = player.fateTags.length
  player.fateTags = player.fateTags.filter((tag) => tag.id !== id)
  return player.fateTags.length < before
}

export function recordLifeEvent(player: Player, record: LifeEventRecord) {
  player.lifeEventHistory.push(record)
  return record
}

export function createLifeTimelineEntry(player: Player, year: number, month: number, text: string, type: LifeTimelineEntry['type'], importance: LifeTimelineEntry['importance']): LifeTimelineEntry {
  return { id: `${year}-${month}-${player.lifeTimeline.length}-${type}`, year, month, age: Math.floor(player.ageMonths / 12), text, type, importance }
}

export function addLifeTimelineEntry(player: Player, entry: LifeTimelineEntry) {
  player.lifeTimeline.push(entry)
  if (entry.importance >= 3) player.importantEvents.push(entry)
  return entry
}

export const importantLifeEvents = (entries: LifeTimelineEntry[]) => entries.filter((entry) => entry.importance >= 3)
