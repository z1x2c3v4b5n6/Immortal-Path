export const CREATION_CONFIG = {
  baseTalentPoints: 5,
  randomTalentPointBonus: 1,
} as const

export const ROOT_STAT_POINT_BONUS: Record<number, number> = {
  5: 0,
  4: 1,
  3: 3,
  2: 5,
  1: 6,
}
