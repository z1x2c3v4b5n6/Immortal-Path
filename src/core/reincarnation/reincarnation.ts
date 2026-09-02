import type { LifeRecord, Player, ReincarnationState } from '../../models'

export const UPGRADE_CONFIG = {
  comprehensionBonus: { name: '宿慧', max: 10, baseCost: 30 },
  luckBonus: { name: '福缘', max: 10, baseCost: 35 },
  constitutionBonus: { name: '先天道体', max: 10, baseCost: 32 },
  spiritRootLuck: { name: '灵根眷顾', max: 8, baseCost: 50 },
} as const

export type UpgradeKey = keyof typeof UPGRADE_CONFIG
export const upgradeCost = (key: UpgradeKey, level: number) => Math.round(UPGRADE_CONFIG[key].baseCost * (1 + level * 0.72) ** 1.35)

export function calculateReincarnationPoints(player: Player): number {
  const ageYears = Math.floor(player.ageMonths / 12)
  return Math.max(8, Math.round(12 + player.realmIndex ** 1.55 * 8 + ageYears * 0.16 + player.achievements.length * 14))
}

export function createLifeRecord(player: Player, deathYear: number, realmName: string, pointsEarned: number): LifeRecord {
  return {
    generation: player.generation, playerName: player.name, birthYear: player.birthYear, deathYear,
    maxRealm: realmName, lifespan: Math.floor(player.ageMonths / 12), causeOfDeath: player.causeOfDeath ?? '命数已尽',
    achievements: [...player.achievements], timeline: [...player.timeline], pointsEarned,
  }
}

export function initialReincarnation(): ReincarnationState {
  return { totalPoints: 0, upgrades: { comprehensionBonus: 0, luckBonus: 0, constitutionBonus: 0, spiritRootLuck: 0 } }
}
