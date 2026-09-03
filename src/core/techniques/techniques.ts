import type { Player, TechniqueDefinition, TechniqueProgress, WorldState } from '../../models'
import { effectiveElementPower } from '../aptitude/aptitude'
import { getWorldModifier } from '../world/world'
import { isFiveElementImbalanced } from '../aptitude/aptitude'
import { acquiredTalentById } from '../../data/acquiredTalents'

export interface TechniqueAffinityBreakdown {
  spiritRoot: number
  path: number
  comprehension: number
  talents: number
  world: number
  other: number
}
export interface TechniqueAffinityResult {
  total: number
  grade: '极差' | '较差' | '尚可' | '良好' | '极佳' | '天作之合' | '大道共鸣'
  breakdown: TechniqueAffinityBreakdown
  maxTechniqueLevel: number
  riskModifier: number
  meetsMinimum: boolean
}

export function calculateTechniqueAffinity(player: Player, technique: TechniqueDefinition, world?: WorldState): TechniqueAffinityResult {
  const rootScore = technique.elements.length
    ? technique.elements.reduce((sum, requirement) => sum + effectiveElementPower(player.spiritualAptitude, requirement.element) * 34 * requirement.weight, 0) * technique.rootDependency
    : 22 * technique.rootDependency
  const pathLevel = technique.preferredPaths.reduce((best, pathId) => Math.max(best, player.pathProgress.find((progress) => progress.pathId === pathId)?.level ?? 0), 0)
  const pathMatch = technique.preferredPaths.includes(player.primaryPath!) ? 24 : player.secondaryPaths.some((progress) => technique.preferredPaths.includes(progress.pathId)) ? 13 : player.primaryPath === 'dao' ? 8 : 2
  const path = pathMatch + Math.min(12, pathLevel * 1.5)
  const comprehension = Math.min(24, player.stats.comprehension * .2)
  const talentIds = new Set([...player.talents.map((talent) => talent.id), ...player.acquiredTalents.map((talent) => talent.talentId)])
  const acquiredBonus = player.acquiredTalents.flatMap((talent) => acquiredTalentById(talent.talentId)?.effects ?? []).reduce((sum, effect) => sum + (effect.type === 'fiveElementAffinity' && technique.elements.length >= 5 ? effect.value : effect.type === 'swordAffinity' && technique.preferredPaths.includes('sword') ? effect.value : 0), 0)
  const talents = (talentIds.has('memory') ? 8 : 0) + acquiredBonus
  const worldScore = world ? Math.round((getWorldModifier(world, 'cultivation') + (player.primaryPath ? getWorldModifier(world, 'pathCultivation', player.primaryPath) : 0)) * 20) : 0
  let other = technique.preferredPaths.includes('body') ? Math.round(player.stats.constitution * .1 + player.bloodline.inheritedTraits.length * 2) : technique.preferredPaths.includes('ghost') ? Math.round(player.stats.soul * .08 + (player.soulStability ?? 0) * .04 + ((world?.continent.cultivationEnvironment.yinQiMultiplier ?? 1) - 1) * 10) : technique.preferredPaths.includes('demonic') ? 8 - Math.round(player.pathResources.innerDemon * .04) : 0
  if (technique.preferredPaths.includes('sword')) other += Math.min(18, Math.round(player.pathResources.swordIntent * .08))
  if (technique.elements.length > 1 && isFiveElementImbalanced(player.spiritualAptitude)) other -= 8
  const total = Math.max(0, Math.round(rootScore + path + comprehension + talents + worldScore + other))
  const grade = total > 120 ? '大道共鸣' : total >= 101 ? '天作之合' : total >= 81 ? '极佳' : total >= 61 ? '良好' : total >= 41 ? '尚可' : total >= 21 ? '较差' : '极差'
  const maxTechniqueLevel = Math.min(technique.maxLevel, Math.max(1, Math.floor(total / 9) + 1))
  const missingElementPenalty = technique.elements.filter((requirement) => effectiveElementPower(player.spiritualAptitude, requirement.element) <= .01).length
  const requiredAcquiredRoots = technique.elements.map((requirement) => player.spiritualAptitude.acquiredRoots.find((root) => root.element === requirement.element)).filter((root) => root && !player.spiritualAptitude.innateRoot.elements.includes(root.element))
  const instability = requiredAcquiredRoots.reduce((sum, root) => sum + (100 - root!.stability) / 100, 0) * .12
  const demonicRelief = talentIds.has('demon-heart') && technique.preferredPaths.includes('demonic') ? .12 : 0
  const riskModifier = Number(Math.max(-.2, Math.min(.8, missingElementPenalty * .12 + instability + (60 - total) / 200 + (player.primaryPath === 'demonic' ? player.pathResources.innerDemon / 250 : 0) - demonicRelief)).toFixed(3))
  return { total, grade, breakdown: { spiritRoot: Math.round(rootScore), path, comprehension: Math.round(comprehension), talents, world: worldScore, other }, maxTechniqueLevel, riskModifier, meetsMinimum: total >= (technique.minimumAffinity ?? 0) }
}

export function techniqueProgress(player: Player, techniqueId: string): TechniqueProgress {
  let progress = player.techniqueProgress.find((entry) => entry.techniqueId === techniqueId)
  if (!progress) { progress = { techniqueId, experience: 0, level: 1 }; player.techniqueProgress.push(progress) }
  return progress
}

export function practiceTechnique(player: Player, technique: TechniqueDefinition, months: number, world?: WorldState) {
  const affinity = calculateTechniqueAffinity(player, technique, world)
  const progress = techniqueProgress(player, technique.id)
  const gained = Math.max(1, Math.round(months * (1 + affinity.total / 100)))
  progress.experience += gained
  while (progress.level < affinity.maxTechniqueLevel && progress.experience >= progress.level * 24) {
    progress.experience -= progress.level * 24
    progress.level++
  }
  return { gained, progress, affinity }
}
