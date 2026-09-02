import { REALMS } from '../../data/realms'
import type { Player } from '../../models'
import { getSpiritRootBreakthroughModifier } from '../spiritRoot/spiritRoot'

export interface BreakthroughChance { base: number; spiritRoot: number; comprehension: number; luck: number; talent: number; final: number }

export function calculateBreakthroughChance(player: Player): BreakthroughChance {
  const base = REALMS[player.realmIndex].breakthroughBaseChance
  const spiritRoot = getSpiritRootBreakthroughModifier(player.spiritRoot)
  const comprehension = (player.stats.comprehension - 50) * 0.002
  const luck = (player.stats.luck - 50) * 0.0009
  const talent = player.talents.reduce((sum, entry) => sum + entry.effects.filter((effect) => effect.type === 'breakthroughBonus').reduce((value, effect) => value + effect.value, 0), 0)
  const final = Math.max(0.12, Math.min(0.96, base + spiritRoot + comprehension + luck + talent))
  return { base, spiritRoot, comprehension, luck, talent, final }
}

export function canBreakthrough(player: Player) {
  return player.alive && player.realmIndex < REALMS.length - 1 && player.cultivation >= player.cultivationRequired
}
