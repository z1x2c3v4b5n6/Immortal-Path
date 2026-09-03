import type { EventChoice, LifeEvent, LifeEventRecord, Player, WorldState } from '../../models'

export function resolveLifeEventChoice(event: LifeEvent, choiceId: string, player: Player, world: WorldState): { choice: EventChoice; record: LifeEventRecord } | undefined {
  const choice = event.choices.find((entry) => entry.id === choiceId)
  if (!choice) return undefined
  return {
    choice,
    record: { eventId: event.id, eventName: event.name, year: world.currentYear, month: world.currentMonth, age: Math.floor(player.ageMonths / 12), choice: choice.id, choiceLabel: choice.label, result: choice.result, importance: event.importance, tags: [...event.tags] },
  }
}
