import type { WorldState } from '../../models'

export function addMonths(world: WorldState, months: number) {
  const absolute = world.currentYear * 12 + world.currentMonth - 1 + months
  world.currentYear = Math.floor(absolute / 12)
  world.currentMonth = absolute % 12 + 1
}

export const formatGameTime = (world: WorldState) => `玄历 ${world.currentYear}年 ${world.currentMonth}月`
