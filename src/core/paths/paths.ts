import { CULTIVATION_PATHS, PATH_COMPATIBILITY, pathExperienceForLevel } from '../../data/cultivationPaths'
import type { CultivationPathId, CultivationPathProgress, PathResources, Player, WorldState } from '../../models'
import { getWorldModifier, getWorldPathMultiplier } from '../world/world'

export const initialPathResources = (): PathResources => ({ swordIntent: 0, qiBlood: 100, maxQiBlood: 100, bodyStage: 0, demonicNature: 0, innerDemon: 0, karma: 0, bloodRiteMonthsRemaining: 0 })

export function pathProgress(player: Player, pathId: CultivationPathId): CultivationPathProgress {
  let progress = player.pathProgress.find((entry) => entry.pathId === pathId)
  if (!progress) {
    progress = { pathId, experience: 0, level: 1 }
    player.pathProgress.push(progress)
  }
  return progress
}

export function addPathExperience(player: Player, pathId: CultivationPathId, amount: number, secondary = false): CultivationPathProgress {
  const progress = pathProgress(player, pathId)
  progress.experience += Math.max(0, amount) * (secondary ? .45 : 1)
  while (progress.level < 20 && progress.experience >= pathExperienceForLevel(progress.level + 1)) progress.level++
  return progress
}

export function canChoosePrimaryPath(player: Player, pathId: CultivationPathId): boolean {
  return !player.primaryPath && player.realmIndex >= 1 && player.unlockedPaths.includes(pathId) && pathId !== 'ghost'
}

export function choosePrimaryPath(player: Player, pathId: CultivationPathId, force = false): boolean {
  if (player.primaryPath || (!force && !canChoosePrimaryPath(player, pathId))) return false
  player.primaryPath = pathId
  pathProgress(player, pathId)
  if (pathId === 'ghost') player.soulStability = Math.max(60, player.soulStability ?? 80)
  return true
}

export function addSecondaryPath(player: Player, pathId: CultivationPathId): boolean {
  if (!player.primaryPath || player.primaryPath === pathId || player.secondaryPaths.length >= 1 || !player.unlockedPaths.includes(pathId)) return false
  const compatibility = PATH_COMPATIBILITY[player.primaryPath][pathId] ?? 0
  if (compatibility < .3) return false
  player.secondaryPaths.push({ pathId, experience: 0, level: 1 })
  pathProgress(player, pathId)
  return true
}

export function pathCultivationMultiplier(player: Player, world?: WorldState): number {
  const pathId = player.primaryPath
  if (!pathId) return world ? getWorldPathMultiplier(world) : 1
  const definition = CULTIVATION_PATHS.find((entry) => entry.id === pathId)!
  const progress = pathProgress(player, pathId)
  let multiplier = definition.cultivationMultiplier * (1 + Math.min(.18, (progress.level - 1) * .012))
  if (pathId === 'sword') multiplier *= 1 + Math.max(0, player.stats.comprehension - 50) / 420
  if (pathId === 'body') multiplier *= .78 + player.stats.constitution / 220
  if (pathId === 'demonic') multiplier *= 1 + Math.min(.2, player.pathResources.demonicNature / 400) + (player.pathResources.bloodRiteMonthsRemaining > 0 ? .3 : 0)
  if (pathId === 'ghost') multiplier *= .8 + player.stats.soul / 180
  if (world) multiplier *= getWorldPathMultiplier(world, pathId)
  return Number(Math.max(.65, Math.min(2.15, multiplier)).toFixed(3))
}

export function spiritRootDependency(pathId?: CultivationPathId): number {
  if (pathId === 'body') return .35
  if (pathId === 'ghost') return .55
  return 1
}

export interface PathTrainingResult { experience: number; statGrowth?: { constitution?: number; soul?: number }; resourceText: string }

export function applyPathTraining(player: Player, months: number, world?: WorldState): PathTrainingResult {
  if (!player.primaryPath) return { experience: 0, resourceText: '' }
  const pathId = player.primaryPath
  const experience = Math.max(1, Math.round(months * (6 + player.realmIndex * .5)))
  addPathExperience(player, pathId, experience)
  const worldGrowth = world ? 1 + getWorldModifier(world, 'statGrowth', pathId) : 1
  if (pathId === 'sword') {
    const gain = Math.max(1, Math.round(months * (1 + player.stats.comprehension / 100) * worldGrowth))
    player.pathResources.swordIntent += gain
    return { experience, resourceText: `剑意 +${gain}` }
  }
  if (pathId === 'body') {
    const gain = Math.max(2, Math.round(months * (2 + player.stats.constitution / 80) * worldGrowth))
    player.pathResources.maxQiBlood += Math.max(1, Math.round(gain * .35))
    player.pathResources.qiBlood = Math.min(player.pathResources.maxQiBlood, player.pathResources.qiBlood + gain)
    player.pathResources.bodyStage = Math.min(5, Math.floor(pathProgress(player, 'body').level / 3))
    return { experience, statGrowth: { constitution: Math.max(1, Math.floor(months / 12 * worldGrowth)) }, resourceText: `气血 +${gain}` }
  }
  if (pathId === 'demonic') {
    const nature = Math.max(1, Math.round(months * 1.4))
    const demon = Math.max(1, Math.round(months * .28))
    player.pathResources.demonicNature = Math.min(100, player.pathResources.demonicNature + nature)
    player.pathResources.innerDemon = Math.min(100, player.pathResources.innerDemon + demon)
    player.pathResources.karma = Math.min(100, player.pathResources.karma + Math.max(1, Math.round(months * .18)))
    return { experience, resourceText: `魔性 +${nature}，心魔 +${demon}` }
  }
  if (pathId === 'ghost') {
    const stability = Math.max(1, Math.round(months * (world?.continent.cultivationEnvironment.yinQiMultiplier ?? 1) * .7))
    player.soulStability = Math.min(100, (player.soulStability ?? 70) + stability)
    return { experience, statGrowth: { soul: Math.max(1, Math.floor(months / 12)) }, resourceText: `魂体稳定 +${stability}` }
  }
  return { experience, resourceText: '道心愈发圆融' }
}

export function secondaryPathMultiplier(player: Player, pathId: CultivationPathId): number {
  const secondary = player.secondaryPaths.find((entry) => entry.pathId === pathId)
  if (!secondary) return 0
  return Math.min(.5, .25 + secondary.level * .015)
}

export function burnLifespanForCultivation(player: Player, years = 5): boolean {
  if (player.primaryPath !== 'demonic' || player.pathResources.bloodRiteMonthsRemaining > 0 || player.lifespanMonths - years * 12 <= player.ageMonths + 12) return false
  player.lifespanBonusMonths -= years * 12
  player.lifespanMonths -= years * 12
  player.pathResources.bloodRiteMonthsRemaining = 120
  player.pathResources.innerDemon = Math.min(100, player.pathResources.innerDemon + 8)
  player.pathResources.karma = Math.min(100, player.pathResources.karma + 6)
  return true
}
