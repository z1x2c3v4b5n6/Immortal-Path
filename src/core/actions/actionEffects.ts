import { BodyRealm, CharacterState, type CultivationResources, type Player } from '../../models'
import { BODY_REALM_ORDER, BODY_REALM_THRESHOLDS } from './action'

export const initialCultivationResources = (): CultivationResources => ({ spiritHerbs: 0, beastCores: 0, bodyMaterials: 0, soulCrystals: 0 })

export function hasCharacterState(player: Player, state: CharacterState) {
  return player.characterStates.includes(state)
}

export function addCharacterState(player: Player, state: CharacterState) {
  if (state !== CharacterState.NORMAL) player.characterStates = player.characterStates.filter((entry) => entry !== CharacterState.NORMAL)
  if (!player.characterStates.includes(state)) player.characterStates.push(state)
}

export function removeCharacterState(player: Player, state: CharacterState) {
  player.characterStates = player.characterStates.filter((entry) => entry !== state && entry !== CharacterState.NORMAL)
  if (!player.characterStates.length) player.characterStates.push(CharacterState.NORMAL)
}

export function normalizeCharacterStates(player: Player) {
  const unique = [...new Set(player.characterStates)]
  player.characterStates = unique.some((entry) => entry !== CharacterState.NORMAL) ? unique.filter((entry) => entry !== CharacterState.NORMAL) : [CharacterState.NORMAL]
  return player.characterStates
}

export function cultivationStateMultiplier(player: Player) {
  let multiplier = 1
  if (hasCharacterState(player, CharacterState.INJURED)) multiplier *= .82
  if (hasCharacterState(player, CharacterState.SERIOUS_INJURY)) multiplier *= .55
  if (hasCharacterState(player, CharacterState.INNER_DEMON)) multiplier *= .72
  if (hasCharacterState(player, CharacterState.ENLIGHTENED)) multiplier *= 1.16
  return multiplier
}

export function breakthroughStateModifier(player: Player) {
  let modifier = 0
  if (hasCharacterState(player, CharacterState.INJURED)) modifier -= .07
  if (hasCharacterState(player, CharacterState.SERIOUS_INJURY)) modifier -= .2
  if (hasCharacterState(player, CharacterState.INNER_DEMON)) modifier -= .12
  if (hasCharacterState(player, CharacterState.ENLIGHTENED)) modifier += .08
  return modifier
}

export function updateBodyRealm(player: Player) {
  let index = 0
  for (let candidate = 0; candidate < BODY_REALM_THRESHOLDS.length; candidate++) if (player.bodyTrainingProgress >= BODY_REALM_THRESHOLDS[candidate]) index = candidate
  player.bodyRealm = BODY_REALM_ORDER[index] ?? BodyRealm.SKIN
  player.pathResources.bodyStage = index
  return player.bodyRealm
}

export function recoverCharacter(player: Player, years: number) {
  if (hasCharacterState(player, CharacterState.SERIOUS_INJURY)) {
    removeCharacterState(player, CharacterState.SERIOUS_INJURY)
    addCharacterState(player, CharacterState.INJURED)
  } else removeCharacterState(player, CharacterState.INJURED)
  if (years >= 2 || player.stats.soul >= 70) removeCharacterState(player, CharacterState.INNER_DEMON)
  removeCharacterState(player, CharacterState.ENLIGHTENED)
  player.pathResources.qiBlood = player.pathResources.maxQiBlood
  if (player.primaryPath === 'ghost') player.soulStability = Math.min(100, (player.soulStability ?? 60) + years * 18)
  normalizeCharacterStates(player)
}
