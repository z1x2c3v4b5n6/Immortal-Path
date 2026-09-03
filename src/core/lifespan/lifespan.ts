import { BASE_LIFESPAN_YEARS } from '../../data/lifespan'
import { pathById } from '../../data/cultivationPaths'
import { REALMS } from '../../data/realms'
import type { Player } from '../../models'

export type AgingStage = '壮年' | '暮年' | '寿元无多' | '大限将至' | '魂体'

export function constitutionLifespanModifier(constitution: number): number {
  return Number((Math.tanh((constitution - 55) / 48) * .13).toFixed(4))
}

export function calculateMaxLifespanMonths(player: Player, realmIndex = player.realmIndex): number {
  const group = REALMS[Math.max(0, Math.min(REALMS.length - 1, realmIndex))].group
  const baseMonths = BASE_LIFESPAN_YEARS[group] * 12
  const talentMultiplier = player.talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'lifespanMultiplier').reduce((sum, effect) => sum + effect.value, 0)
  const primaryProgress = player.primaryPath ? player.pathProgress.find((entry) => entry.pathId === player.primaryPath) : undefined
  const pathBase = pathById(player.primaryPath)?.lifespanMultiplier ?? 1
  const bodyGrowth = player.primaryPath === 'body' ? Math.min(.1, Math.max(0, (primaryProgress?.level ?? 1) - 1) * .008) : 0
  const bloodline = Math.min(.05, Math.max(0, player.bloodline.bloodlineLevel - 1) * .01)
  const multiplier = Math.max(.72, Math.min(1.55, pathBase + bodyGrowth + constitutionLifespanModifier(player.stats.constitution) + talentMultiplier + bloodline + player.lifespanFateModifier))
  return Math.max(player.ageMonths + 1, Math.round((baseMonths + player.lifespanBonusMonths) * multiplier))
}

export function agingStage(player: Player): AgingStage {
  if (player.primaryPath === 'ghost') return '魂体'
  const ratio = player.lifespanMonths > 0 ? player.ageMonths / player.lifespanMonths : 1
  if (ratio >= .97) return '大限将至'
  if (ratio >= .9) return '寿元无多'
  if (ratio >= .8) return '暮年'
  return '壮年'
}

export const isNaturalLifespanExpired = (player: Player) => player.primaryPath !== 'ghost' && player.ageMonths >= player.lifespanMonths
export const isSoulDispersed = (player: Player) => player.primaryPath === 'ghost' && (player.soulStability ?? 0) <= 0
