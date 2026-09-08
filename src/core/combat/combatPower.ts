import { techniqueById } from '../../data/techniques'
import { BodyRealm, CharacterState, type CombatPowerBreakdown, type NPCCultivator, type Player, type WorldState } from '../../models'
import { calculateTechniqueAffinity } from '../techniques/techniques'

const bodyRealmPower: Record<BodyRealm, number> = {
  [BodyRealm.SKIN]: 0,
  [BodyRealm.FLESH]: 28,
  [BodyRealm.BONE]: 68,
  [BodyRealm.VISCERA]: 120,
  [BodyRealm.BLOOD]: 190,
  [BodyRealm.GOLDEN_BODY]: 300,
}

export function realmCombatBase(realmIndex: number) {
  if (realmIndex <= 0) return 30
  if (realmIndex <= 10) return 85 + realmIndex * 31
  const group = Math.floor((realmIndex - 11) / 4)
  const stage = (realmIndex - 11) % 4
  const bases = [500, 1380, 3600, 8500, 19000, 42000, 90000, 190000, 400000]
  return Math.round((bases[group] ?? bases[bases.length - 1] * (group - bases.length + 2)) * (1 + stage * .22))
}

function techniquePower(player: Player, world?: WorldState) {
  const definition = player.activeTechnique ? techniqueById(player.activeTechnique) : undefined
  if (!definition) return 18
  const level = player.techniqueProgress.find((entry) => entry.techniqueId === definition.id)?.level ?? 1
  const grade = { 黄阶: 16, 玄阶: 32, 地阶: 54, 天阶: 82 }[definition.grade]
  const affinity = calculateTechniqueAffinity(player, definition, world).total
  return Math.round(grade + level * 7 + affinity * .32)
}

function pathPower(player: Player) {
  const level = player.pathProgress.find((entry) => entry.pathId === player.primaryPath)?.level ?? 0
  if (player.primaryPath === 'sword') return Math.round(38 + level * 12 + player.pathResources.swordIntent * .55)
  if (player.primaryPath === 'body') return Math.round(35 + level * 10 + bodyRealmPower[player.bodyRealm] + player.pathResources.maxQiBlood * .16)
  if (player.primaryPath === 'demonic') return Math.round(42 + level * 11 + player.pathResources.demonicNature * .42)
  if (player.primaryPath === 'ghost') return Math.round(34 + level * 11 + (player.soulStability ?? 50) * .32)
  return Math.round(28 + level * 10)
}

export function calculateCombatPower(player: Player, world?: WorldState): CombatPowerBreakdown {
  const realm = realmCombatBase(player.realmIndex)
  const technique = techniquePower(player, world)
  const averageGrowth = player.spiritRoot.elements.reduce((sum, element) => sum + (player.spiritualAptitude.elementalGrowth[element] ?? 0), 0) / Math.max(1, player.spiritRoot.elements.length)
  const root = Math.round(18 + player.spiritRoot.specializationMultiplier * 24 + player.spiritRoot.cultivationMultiplier * 12 + averageGrowth * .16)
  const stats = Math.round(player.stats.constitution * .55 + player.stats.soul * .42 + player.stats.comprehension * .28 + player.stats.luck * .12)
  const talents = player.talents.reduce((sum, talent) => sum + talent.cost * 7, 0) + player.acquiredTalents.length * 18
  const path = pathPower(player)
  const artifacts = player.equippedArtifacts.reduce((sum, artifact) => sum + artifact.power + artifact.attack * .7 + artifact.defense * .55, 0)
  let state = 0
  if (player.characterStates.includes(CharacterState.INJURED)) state -= Math.round(realm * .08)
  if (player.characterStates.includes(CharacterState.SERIOUS_INJURY)) state -= Math.round(realm * .24)
  if (player.characterStates.includes(CharacterState.INNER_DEMON)) state -= Math.round(realm * .12)
  if (player.characterStates.includes(CharacterState.ENLIGHTENED)) state += Math.round(realm * .08)
  const experience = Math.min(Math.round(realm * .18), Math.round(Math.sqrt(player.battleStats.experience) * 5 + player.battleStats.wins * 2))
  const total = Math.max(1, Math.round(realm + technique + root + stats + talents + path + artifacts + state + experience))
  return { realm, technique, root, stats, talents, path, artifacts, state, experience, total }
}

export function calculateNPCCombatPower(npc: NPCCultivator) {
  const realm = realmCombatBase(npc.realmIndex)
  const root = 20 + npc.spiritRoot.specializationMultiplier * 28
  const path = npc.path === 'sword' || npc.path === 'demonic' ? realm * .15 : npc.path === 'body' ? realm * .12 : realm * .08
  const talent = npc.talents.length * 22
  const technique = 25 + npc.knownTechniques.length * 24
  const experience = Math.min(realm * .16, Math.sqrt(npc.battleStats.experience) * 5)
  return Math.max(1, Math.round(realm + root + path + talent + technique + experience))
}
