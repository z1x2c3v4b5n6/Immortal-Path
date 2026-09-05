import type { FamilyState, Player } from '../../models'

export function familyForPlayer(families: FamilyState[], player: Player) { return families.find((entry) => entry.id === player.familyId) }

export function simulateFamilies(families: FamilyState[], months: number) {
  for (const family of families) {
    const years = months / 12
    const cultivationBonus = family.kind === '凡人家族' ? .35 : 1
    family.resources = Math.max(0, Math.round(family.resources + years * cultivationBonus * (1 + family.memberIds.length / 20)))
    family.fame = Math.max(0, Math.min(100, family.fame + (family.resources > 100 ? .05 : -.03) * years))
  }
}

