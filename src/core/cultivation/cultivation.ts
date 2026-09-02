import { REALMS } from '../../data/realms'
import type { Player } from '../../models'

export function calculateCultivationGain(player: Player, months: number): number {
  const realm = REALMS[player.realmIndex]
  const talentMultiplier = player.talents.reduce((total, talent) => total * (talent.cultivationMultiplier ?? 1), 1)
  const comprehensionMultiplier = 0.72 + player.stats.comprehension / 100
  const variance = 0.92 + ((player.stats.luck % 11) / 100)
  return Math.max(1, Math.round(realm.cultivationBase * months * player.spiritRoot.multiplier * talentMultiplier * comprehensionMultiplier * variance))
}
