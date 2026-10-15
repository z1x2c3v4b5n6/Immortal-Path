import { pillById } from '../../data/pills'
import { CharacterState, type PillDefinition, type Player, type SpiritElement } from '../../models'
import { normalizeCharacterStates, removeCharacterState } from '../actions/actionEffects'
import { growElement, purifySpiritRoot, stabilizeSpiritRoot } from '../aptitude/aptitude'

export const pillEffectMultiplier = (toxicity: number) => Math.max(.6, 1 - Math.max(0, toxicity) * .004)
export const pillInInventory = (player: Player, pillId: string) => player.inventory.some((entry) => entry.itemId === pillId && entry.quantity > 0)

export function breakthroughPillFor(player: Player, targetGroup: string, preferredId?: string) {
  const candidates = player.inventory.filter((entry) => entry.quantity > 0).map((entry) => pillById(entry.itemId)).filter((pill): pill is PillDefinition => Boolean(pill?.effects.some((effect) => effect.type === 'BREAKTHROUGH' && effect.target === targetGroup)))
  return (preferredId ? candidates.find((pill) => pill.id === preferredId) : undefined) ?? candidates[0]
}

export function recordPill(player: Player, pill: PillDefinition, year: number, effectiveValue: number) {
  const toxicityAdded = Math.round((pill.toxicity ?? 0) * 10) / 10
  player.pillToxicity = Math.max(0, Math.min(100, player.pillToxicity + toxicityAdded))
  player.consumedPillHistory.unshift({ pillId: pill.id, year, effectiveValue, toxicityAdded })
  player.consumedPillHistory.splice(100)
}

export function consumeInventoryItem(player: Player, itemId: string) {
  const stack = player.inventory.find((entry) => entry.itemId === itemId && entry.quantity > 0)
  if (!stack) return false
  stack.quantity--
  player.inventory = player.inventory.filter((entry) => entry.quantity > 0)
  return true
}

export function usePill(player: Player, pillId: string, year: number) {
  const pill = pillById(pillId)
  if (!pill || !pillInInventory(player, pillId) || pill.effects.some((effect) => effect.type === 'BREAKTHROUGH' || effect.type === 'COMBAT_POWER' || effect.type === 'PROTECT_HEART')) return { ok: false, message: '此丹需在对应场景中使用。', value: 0 }
  const multiplier = pillEffectMultiplier(player.pillToxicity)
  let value = 0
  let message = ''
  for (const effect of pill.effects) {
    if (effect.type === 'CULTIVATION') { value += Math.round(effect.value * multiplier); player.cultivation += Math.round(effect.value * multiplier); message = `修为增长 ${value}` }
    if (effect.type === 'HEAL') {
      if (effect.value >= 2 && player.characterStates.includes(CharacterState.SERIOUS_INJURY)) { removeCharacterState(player, CharacterState.SERIOUS_INJURY); player.characterStates.push(CharacterState.INJURED); message = '重伤缓解为轻伤'; value = 1 }
      else if (player.characterStates.includes(CharacterState.INJURED)) { removeCharacterState(player, CharacterState.INJURED); message = '轻伤已经痊愈'; value = 1 }
      else return { ok: false, message: '当前没有可由此丹医治的伤势。', value: 0 }
      normalizeCharacterStates(player)
    }
    if (effect.type === 'LIFESPAN') {
      const count = player.consumedPillHistory.filter((entry) => ['longevity-pill', 'greater-longevity-pill'].includes(entry.pillId)).length
      const diminish = [1, .6, .3, .08][Math.min(3, count)]
      value = Math.max(0, Math.round(effect.value * 12 * diminish * multiplier))
      player.lifespanBonusMonths += value; player.lifespanMonths += value; message = `寿元上限增加 ${Math.round(value / 12 * 10) / 10} 年`
    }
    if (effect.type === 'ACQUIRED_ROOT') {
      const root = player.spiritualAptitude.acquiredRoots.find((entry) => entry.element === effect.target)
      if (!root) return { ok: false, message: `尚无后天${effect.target}灵根可供洗炼。`, value: 0 }
      value = Math.max(1, Math.round(effect.value * multiplier)); purifySpiritRoot(player.spiritualAptitude, root.element, value); stabilizeSpiritRoot(player.spiritualAptitude, root.element, 2); message = `后天${root.element}灵根纯度 +${value}，稳定度 +2`
    }
    if (effect.type === 'FIVE_ELEMENT') {
      const entries = Object.entries(player.spiritualAptitude.elementalGrowth) as [SpiritElement, number][]
      const lowest = entries.filter(([element]) => ['金', '木', '水', '火', '土'].includes(element)).sort((a, b) => a[1] - b[1])[0]
      if (lowest) { value = Math.max(1, Math.round(effect.value * multiplier)); growElement(player.spiritualAptitude, lowest[0], value); message = `${lowest[0]}行成长 +${value}` }
    }
    if (effect.type === 'DETOX') { value = Math.round(effect.value); player.pillToxicity = Math.max(0, player.pillToxicity - value); message = `丹毒降低 ${value}` }
  }
  if (!consumeInventoryItem(player, pillId)) return { ok: false, message: '丹药数量不足。', value: 0 }
  recordPill(player, pill, year, value)
  return { ok: true, message, value }
}

export function decayPillToxicity(player: Player, months: number, resting = false) {
  const amount = months / (resting ? 4 : 12)
  const before = player.pillToxicity
  player.pillToxicity = Math.max(0, player.pillToxicity - amount)
  return before - player.pillToxicity
}
