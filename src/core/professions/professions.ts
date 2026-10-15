import type { Player, ProfessionId, ProfessionProgress } from '../../models'

export const initialProfessionProgress = (): ProfessionProgress[] => (['ALCHEMY', 'REFINING', 'COMMERCE'] as ProfessionId[]).map((id) => ({ id, experience: 0, level: 0, totalActions: 0, successes: 0, mastery: 0 }))

export function profession(player: Player, id: ProfessionId) {
  let progress = player.professionProgress.find((entry) => entry.id === id)
  if (!progress) { progress = { id, experience: 0, level: 0, totalActions: 0, successes: 0, mastery: 0 }; player.professionProgress.push(progress) }
  return progress
}

export function addProfessionExperience(player: Player, id: ProfessionId, amount: number, success = true) {
  const progress = profession(player, id)
  progress.totalActions++
  if (success) progress.successes++
  progress.experience += Math.max(0, Math.round(amount))
  progress.level = Math.min(100, Math.floor(Math.sqrt(progress.experience) * 2.5))
  progress.mastery = Math.min(100, progress.level + Math.floor(progress.successes / 8))
  return progress
}

export function commerceSpread(player: Player) {
  const level = profession(player, 'COMMERCE').level
  return { buyDiscount: Math.min(.1, level * .001), sellBonus: Math.min(.1, level * .001), auctionFeeDiscount: Math.min(.018, level * .00018) }
}
