import { REALMS } from '../../data/realms'
import { CombatStrategy, type BattleCard, type BattleStats, type CombatEnemy, type CombatEnemyType, type EliteModifier, type EquippedArtifact, type Player, type SpiritElement } from '../../models'
import type { RandomService } from '../random/RandomService'
import { realmCombatBase } from './combatPower'

export const initialBattleStats = (): BattleStats => ({ battles: 0, wins: 0, losses: 0, escapes: 0, kills: 0, beastKills: 0, upsetWins: 0, winStreak: 0, experience: 0 })

export const BATTLE_CARD_CATALOG: BattleCard[] = [
  { id: 'blood-burning', name: '燃血秘术', type: 'secret-art', description: '燃烧寿元换取三成爆发。', powerMultiplier: .3, defenseMultiplier: 0, escapeBonus: 0, lifespanCost: 12, charges: 1 },
  { id: 'life-saving-pill', name: '护心丹', type: 'pill', description: '护住心脉，降低败亡风险。', powerMultiplier: .04, defenseMultiplier: .22, escapeBonus: .08, lifespanCost: 0, charges: 1 },
  { id: 'thunder-talisman', name: '天雷符', type: 'talisman', description: '引雷轰敌，首轮攻势大增。', powerMultiplier: .22, defenseMultiplier: 0, escapeBonus: 0, lifespanCost: 0, charges: 1 },
  { id: 'void-talisman', name: '小挪移符', type: 'talisman', description: '撕裂方寸，显著提高遁逃机会。', powerMultiplier: 0, defenseMultiplier: .06, escapeBonus: .32, lifespanCost: 0, charges: 1 },
]

export const ARTIFACT_CATALOG: EquippedArtifact[] = [
  { id: 'green-edge-sword', name: '青锋飞剑', slot: 'weapon', attack: 55, defense: 0, power: 24, element: '金', specialEffect: '剑修攻势提高' },
  { id: 'mountain-armor', name: '镇岳甲', slot: 'armor', attack: 0, defense: 70, power: 28, element: '土', specialEffect: '降低重伤风险' },
  { id: 'soul-bell', name: '定魂铃', slot: 'special', attack: 18, defense: 32, power: 34, element: '暗', specialEffect: '稳定神魂' },
]

const enemyNames: Record<CombatEnemyType, string[]> = {
  beast: ['赤目妖狼', '铁背苍熊', '雷纹妖鹰', '噬魂阴蟒'],
  cultivator: ['黑风劫修', '藏锋散人', '血衣道人', '夺宝客'],
  rival: ['同期天骄', '宗门宿敌', '争榜剑客'],
  sect: ['敌宗执事', '敌宗真传', '护脉长老'],
  family: ['敌族供奉', '争地客卿', '血仇修士'],
}

const elements: SpiritElement[] = ['金', '木', '水', '火', '土', '雷', '冰', '风', '暗', '光']

const ELITE_MODIFIERS: EliteModifier[] = [
  { id: 'BERSERK', name: '狂暴', description: '攻击强横，护身稍弱。' },
  { id: 'ARMORED', name: '坚甲', description: '护甲厚重，难以破防。' },
  { id: 'BLOODTHIRSTY', name: '嗜血', description: '濒危时攻势更凶。' },
  { id: 'AGILE', name: '灵敏', description: '身法飘忽，难以脱离。' },
  { id: 'SWORD_BONE', name: '剑骨', description: '对剑道攻伐有额外抗性。' },
  { id: 'SOUL_DEVOURING', name: '噬魂', description: '神魂攻势尤为狠厉。' },
]

export function createCombatEnemy(player: Player, type: CombatEnemyType, rng: RandomService, difficulty = 0, npc?: { id: string; name: string; realmIndex: number; path: Player['primaryPath']; combatPower: number; spiritRoot: Player['spiritRoot'] }): CombatEnemy {
  const realmIndex = npc?.realmIndex ?? Math.max(0, Math.min(REALMS.length - 1, player.realmIndex + difficulty))
  const base = npc?.combatPower || realmCombatBase(realmIndex)
  const variance = npc ? 1 : rng.randomInt(82, 124) / 100
  const combatPower = Math.max(20, Math.round(base * variance + (type === 'beast' ? realmCombatBase(realmIndex) * .12 : 45)))
  const eliteModifiers = !npc && difficulty >= 1 && rng.chance(Math.min(.72, .22 + difficulty * .14)) ? Array.from({ length: rng.chance(.28) ? 2 : 1 }, () => rng.pick(ELITE_MODIFIERS)).filter((entry, index, list) => list.findIndex((other) => other.id === entry.id) === index) : []
  const attackMultiplier = eliteModifiers.some((entry) => entry.id === 'BERSERK') ? 1.18 : 1
  const defenseMultiplier = eliteModifiers.some((entry) => entry.id === 'ARMORED') ? 1.22 : eliteModifiers.some((entry) => entry.id === 'BERSERK') ? .9 : 1
  return {
    id: npc?.id ?? crypto.randomUUID(), npcId: npc?.id, name: npc?.name ?? rng.pick(enemyNames[type]), type, realmIndex,
    path: npc?.path ?? (type === 'beast' ? 'body' : rng.pick(['dao', 'sword', 'body', 'demonic', 'ghost'] as const)),
    elements: npc?.spiritRoot.elements ?? [rng.pick(elements)], combatPower,
    attack: Math.round(combatPower * (type === 'beast' ? .16 : .14) * attackMultiplier), defense: Math.round(combatPower * (type === 'beast' ? .1 : .12) * defenseMultiplier), health: Math.max(100, Math.round(combatPower * .85)),
    description: type === 'beast' ? '妖气逼人，利爪间还沾着未干的血。' : type === 'rival' ? '同代修士拦在前路，要以此战分出高下。' : '来者气机锁定于你，显然没有善意。',
    recommendedRealmIndex: Math.max(0, realmIndex), rewardStones: Math.max(8, Math.round(combatPower * .12)), rewardItemId: type === 'beast' ? 'core' : undefined, eliteModifiers,
  }
}

export function defaultCombatStrategy() { return CombatStrategy.BALANCED }
