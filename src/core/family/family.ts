import type { FamilyState, Player, TerritoryState } from '../../models'

export function promoteCultivationFamily(family: FamilyState, player: Player, name: string, year: number, territory?: TerritoryState) {
  family.name = name.trim() || family.name
  family.kind = '玩家家族'
  family.resources = Math.max(family.resources, Math.floor(player.spiritStones * .2))
  family.fame = Math.max(family.fame, player.realmIndex * 3)
  family.territory = territory?.name ?? family.territory ?? '无固定族地'
  family.history.unshift({ id: crypto.randomUUID(), year, text: `${player.name}建立${family.name}修仙家族。`, type: 'family' })
  return family
}

export function inheritFamilyLegacy(family: FamilyState) {
  return { spiritStones: Math.floor((family.wealth + family.resources) * .5), fame: family.fame, bloodline: family.bloodline, history: [...family.history] }
}
