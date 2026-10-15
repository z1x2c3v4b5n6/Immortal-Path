import { itemById } from '../../data/items'
import type { ArtifactActiveEffect, BattleCard, EquipmentSlot, ItemDefinition, ItemEffect, ItemEffectType, Player } from '../../models'

export const emptyEquipment = () => ({ artifactSlots: [] as string[] })

export function equippedItemIds(player: Player) {
  return [player.equipment.weapon, player.equipment.armor, player.equipment.accessory, ...player.equipment.artifactSlots].filter((id): id is string => Boolean(id))
}

export function equippedItems(player: Player) {
  return equippedItemIds(player).map(itemById).filter((item): item is ItemDefinition => Boolean(item))
}

export function effectApplies(player: Player, effect: ItemEffect) {
  const condition = effect.condition
  if (!condition) return true
  if (condition.minRealmIndex !== undefined && player.realmIndex < condition.minRealmIndex) return false
  if (condition.paths?.length && (!player.primaryPath || !condition.paths.includes(player.primaryPath))) return false
  if (condition.elements?.length && !condition.elements.some((element) => player.spiritRoot.elements.includes(element) || player.spiritualAptitude.acquiredRoots.some((root) => root.element === element))) return false
  return true
}

export function equipmentEffects(player: Player, type?: ItemEffectType) {
  return equippedItems(player).flatMap((item) => item.itemEffects ?? []).filter((effect) => (!type || effect.type === type) && effectApplies(player, effect))
}

export function equipmentEffectTotal(player: Player, type: ItemEffectType) {
  return equipmentEffects(player, type).reduce((sum, effect) => sum + effect.value, 0)
}

export function itemCombatContribution(player: Player, item: ItemDefinition) {
  const effects = (item.itemEffects ?? []).filter((effect) => effectApplies(player, effect))
  const raw = (item.combatPower ?? 0)
    + effects.filter((e) => e.type === 'ATTACK').reduce((sum, e) => sum + e.value * .7, 0)
    + effects.filter((e) => e.type === 'DEFENSE').reduce((sum, e) => sum + e.value * .55, 0)
    + effects.filter((e) => e.type === 'COMBAT_HEALTH').reduce((sum, e) => sum + e.value * .16, 0)
    + effects.filter((e) => e.type === 'COMBAT_POWER').reduce((sum, e) => sum + e.value, 0)
    + effects.filter((e) => ['SWORD_INTENT', 'ELEMENT_POWER', 'STRATEGY_OFFENSE', 'STRATEGY_DEFENSE'].includes(e.type)).reduce((sum, e) => sum + e.value * 90, 0)
  const fit = itemPathFit(player, item)
  return Math.round(raw * (fit.score >= 2 ? 1.12 : fit.score < 0 ? .72 : 1))
}

export function equipmentCombatContribution(player: Player) {
  const base = equippedItems(player).reduce((sum, item) => sum + itemCombatContribution(player, item), 0)
  const bond = player.boundArtifact ? Math.round(Math.min(80, player.boundArtifact.nourishment / 20 + player.boundArtifact.affinity / 4) + boundArtifactStage(player).combatBonus) : 0
  return base + bond
}

export function boundArtifactStage(player: Player) {
  const affinity = player.boundArtifact?.affinity ?? 0
  if (affinity >= 100) return { id: 4, name: '人器合一', combatBonus: 20, activeBonus: .10 }
  if (affinity >= 75) return { id: 3, name: '如臂使指', combatBonus: 13, activeBonus: .07 }
  if (affinity >= 50) return { id: 2, name: '心意相通', combatBonus: 8, activeBonus: .04 }
  if (affinity >= 25) return { id: 1, name: '初步认主', combatBonus: 4, activeBonus: .02 }
  return { id: 0, name: '初炼', combatBonus: 0, activeBonus: 0 }
}

export function itemPathFit(player: Player, item: ItemDefinition) {
  let score = 0
  const reasons: string[] = []
  if (item.preferredPaths?.includes(player.primaryPath!)) { score += 2; reasons.push('道途契合') }
  else if (item.preferredPaths?.length) { score -= 1; reasons.push('道途不合') }
  if (item.preferredElements?.some((element) => player.spiritRoot.elements.includes(element))) { score += 1; reasons.push('灵根契合') }
  else if (item.preferredElements?.length) { score -= .5; reasons.push('灵根不合') }
  return { score, grade: score >= 3 ? '极佳' : score >= 2 ? '优秀' : score >= 1 ? '适合' : score >= 0 ? '普通' : '欠佳', reasons }
}

export function canEquipItem(player: Player, item: ItemDefinition) {
  if (!item.equipmentSlot) return { ok: false, reason: '此物不可装备' }
  if (item.requiredRealmIndex !== undefined && player.realmIndex < item.requiredRealmIndex) return { ok: false, reason: '境界不足' }
  if (!player.inventory.some((entry) => entry.itemId === item.id && entry.quantity > 0)) return { ok: false, reason: '乾坤袋中没有此物' }
  return { ok: true, reason: '' }
}

export function equipItem(player: Player, itemId: string) {
  const item = itemById(itemId)
  if (!item) return { ok: false, reason: '物品不存在' }
  const allowed = canEquipItem(player, item)
  if (!allowed.ok) return allowed
  const slot = item.equipmentSlot as EquipmentSlot
  if (slot === 'artifact') {
    if (player.equipment.artifactSlots.includes(itemId)) return { ok: true, reason: '已经装备' }
    player.equipment.artifactSlots = [...player.equipment.artifactSlots.slice(0, 1), itemId]
  } else player.equipment[slot] = itemId
  return { ok: true, reason: '' }
}

export function unequipItem(player: Player, itemId: string) {
  let changed = false
  for (const slot of ['weapon', 'armor', 'accessory'] as const) if (player.equipment[slot] === itemId) { player.equipment[slot] = undefined; changed = true }
  const next = player.equipment.artifactSlots.filter((id) => id !== itemId)
  if (next.length !== player.equipment.artifactSlots.length) { player.equipment.artifactSlots = next; changed = true }
  return changed
}

export function isEquipped(player: Player, itemId: string) { return equippedItemIds(player).includes(itemId) }

export function bindArtifact(player: Player, artifactId: string, year: number, legacy?: { formerOwners: string[]; totalNourishment: number; legacyLevel: number }) {
  const item = itemById(artifactId)
  if (player.boundArtifact || player.realmIndex < 11 || !item?.artifact || !player.inventory.some((entry) => entry.itemId === artifactId && entry.quantity > 0)) return false
  player.boundArtifact = { artifactId, bondedAtYear: year, nourishment: 0, affinity: Math.max(10, 30 + itemPathFit(player, item).score * 8 + (legacy?.legacyLevel ?? 0) * 2), formerOwners: legacy?.formerOwners ?? [], totalNourishment: legacy?.totalNourishment ?? 0, legacyLevel: legacy?.legacyLevel ?? 0 }
  if (!isEquipped(player, artifactId)) equipItem(player, artifactId)
  return true
}

export function unbindArtifact(player: Player) { if (!player.boundArtifact) return false; player.boundArtifact = null; return true }

export function nourishBoundArtifact(player: Player, amount: number, affinity = Math.max(1, Math.floor(amount / 20))) {
  if (!player.boundArtifact || amount <= 0) return false
  player.boundArtifact.nourishment = Math.max(0, player.boundArtifact.nourishment + Math.floor(amount))
  player.boundArtifact.totalNourishment += Math.floor(amount)
  player.boundArtifact.legacyLevel = Math.min(5, Math.floor(player.boundArtifact.totalNourishment / 120))
  player.boundArtifact.affinity = Math.max(0, Math.min(100, player.boundArtifact.affinity + affinity))
  return true
}

export function activeArtifactEffects(player: Player): ArtifactActiveEffect[] {
  return equippedItems(player).map((item) => item.artifact?.activeEffect).filter((effect): effect is ArtifactActiveEffect => Boolean(effect))
}

export function artifactBattleCard(player: Player, itemId: string): BattleCard | undefined {
  if (!isEquipped(player, itemId)) return undefined
  const item = itemById(itemId)
  const active = item?.artifact?.activeEffect
  if (!item || !active) return undefined
  const stage = player.boundArtifact?.artifactId === itemId ? boundArtifactStage(player).activeBonus : 0
  const boosted = active.value * (1 + stage)
  const values = active.type === 'POWER_BURST' ? { powerMultiplier: boosted, defenseMultiplier: 0, escapeBonus: 0 } : active.type === 'SOUL_DISRUPTION' ? { powerMultiplier: boosted * .55, defenseMultiplier: .06, escapeBonus: 0 } : active.type === 'ESCAPE' ? { powerMultiplier: 0, defenseMultiplier: .04, escapeBonus: boosted } : active.type === 'PROTECTION' ? { powerMultiplier: 0, defenseMultiplier: boosted, escapeBonus: .04 } : { powerMultiplier: .05, defenseMultiplier: .1, escapeBonus: .08 }
  return { id: `artifact:${item.id}`, name: item.name, type: 'artifact', description: active.description, ...values, lifespanCost: 0, charges: 1 }
}
