import type { LifeRecord, Player, ReincarnationSelections, ReincarnationState, TalentQuality } from '../../models'

export const defaultSelections = (): ReincarnationSelections => ({ extraTalentPoints: 0, statCapBonus: 0, maxTalentQuality: '优秀', maxRootRank: 4, advancedOriginAccess: false, carryMemory: false })
export const initialReincarnation = (): ReincarnationState => ({ totalPoints: 0, unlockedTalents: [], unlockedOrigins: [], rareEventCount: 0, selections: defaultSelections(), inHall: false })

export type FatePurchase = 'talentPoint' | 'statCap' | 'talentRare' | 'talentEpic' | 'rootSingle' | 'rootVariant' | 'rootHeaven' | 'advancedOrigin' | 'memory'
export const FATE_OPTIONS: Record<FatePurchase, { name: string; description: string; cost: number }> = {
  talentPoint: { name: '天赋点 +1', description: '只为下一世增加一点天赋预算，最多购买四次。', cost: 55 },
  statCap: { name: '属性上限 +5', description: '只为下一世提高全部属性上限，最多两次。', cost: 45 },
  talentRare: { name: '稀有天赋权限', description: '下一世可以选择已满足因果的稀有天赋。', cost: 90 },
  talentEpic: { name: '极品天赋权限', description: '下一世可以选择已满足因果的极品天赋。', cost: 180 },
  rootSingle: { name: '单灵根权限', description: '下一世可以手动指定单灵根。', cost: 70 },
  rootVariant: { name: '异灵根权限', description: '下一世可以手动指定异灵根。', cost: 150 },
  rootHeaven: { name: '天灵根权限', description: '下一世可以手动指定天灵根。', cost: 300 },
  advancedOrigin: { name: '高级出身权限', description: '下一世可以选择修仙家族等高级出身。', cost: 120 },
  memory: { name: '携带前世记忆', description: '下一世的生平将记录前世姓名与部分因果。', cost: 80 },
}

const qualityRank: Record<TalentQuality, number> = { 普通: 0, 优秀: 1, 稀有: 2, 极品: 3, 传说: 4 }

export function canPurchaseFate(state: ReincarnationState, purchase: FatePurchase) {
  if (!state.inHall || state.totalPoints < FATE_OPTIONS[purchase].cost) return false
  const selection = state.selections
  if (purchase === 'talentPoint') return selection.extraTalentPoints < 4
  if (purchase === 'statCap') return selection.statCapBonus < 10
  if (purchase === 'talentRare') return qualityRank[selection.maxTalentQuality] < 2
  if (purchase === 'talentEpic') return qualityRank[selection.maxTalentQuality] >= 2 && qualityRank[selection.maxTalentQuality] < 3
  if (purchase === 'rootSingle') return selection.maxRootRank < 5
  if (purchase === 'rootVariant') return selection.maxRootRank >= 5 && selection.maxRootRank < 6
  if (purchase === 'rootHeaven') return selection.maxRootRank >= 6 && selection.maxRootRank < 7
  if (purchase === 'advancedOrigin') return !selection.advancedOriginAccess
  return !selection.carryMemory
}

export function applyFatePurchase(state: ReincarnationState, purchase: FatePurchase) {
  if (!canPurchaseFate(state, purchase)) return false
  state.totalPoints -= FATE_OPTIONS[purchase].cost
  if (purchase === 'talentPoint') state.selections.extraTalentPoints++
  if (purchase === 'statCap') state.selections.statCapBonus += 5
  if (purchase === 'talentRare') state.selections.maxTalentQuality = '稀有'
  if (purchase === 'talentEpic') state.selections.maxTalentQuality = '极品'
  if (purchase === 'rootSingle') state.selections.maxRootRank = 5
  if (purchase === 'rootVariant') state.selections.maxRootRank = 6
  if (purchase === 'rootHeaven') state.selections.maxRootRank = 7
  if (purchase === 'advancedOrigin') state.selections.advancedOriginAccess = true
  if (purchase === 'memory') state.selections.carryMemory = true
  return true
}

export function calculateReincarnationPoints(player: Player): number {
  const ageYears = Math.floor(player.ageMonths / 12)
  return Math.max(8, Math.round(12 + player.realmIndex ** 1.55 * 8 + ageYears * .16 + player.achievements.length * 14))
}

export function createLifeRecord(player: Player, deathYear: number, realmName: string, pointsEarned: number): LifeRecord {
  return {
    generation: player.generation, playerName: player.name, playerId: player.id, birthYear: player.birthYear, deathYear,
    maxRealm: realmName, lifespan: Math.floor(player.ageMonths / 12), causeOfDeath: player.causeOfDeath ?? '命数已尽',
    achievements: [...player.achievements], timeline: [...player.timeline], pointsEarned, entryType: player.entryType,
    parentId: player.parentId, predecessorName: player.predecessorName, familyId: player.familyId,
  }
}
