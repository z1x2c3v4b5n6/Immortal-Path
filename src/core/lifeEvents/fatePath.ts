import { FATE_PATHS } from '../../data/fatePaths'
import type { FatePathState, Player } from '../../models'

export function evaluateFatePaths(player: Player, year: number) {
  const newlyCompleted: FatePathState[] = []
  for (const definition of FATE_PATHS) {
    const result = definition.calculate(player)
    let state = player.fatePaths.find((entry) => entry.id === definition.id)
    if (!state) {
      state = { id: definition.id, name: definition.name, description: definition.description, progress: result.progress, status: 'forming', milestones: result.milestones, evaluation: definition.evaluation }
      player.fatePaths.push(state)
    } else {
      state.progress = Math.max(state.progress, result.progress)
      state.milestones = [...new Set([...state.milestones, ...result.milestones])]
    }
    if (state.status !== 'completed' && state.progress >= 100) {
      state.status = 'completed'
      state.completedYear = year
      newlyCompleted.push(state)
    }
  }
  return newlyCompleted
}

export const completedFateEvaluation = (player: Player) => player.fatePaths.filter((path) => path.status === 'completed').reduce((sum, path) => sum + path.evaluation, 0)
