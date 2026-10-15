import type { CombatRecord, CombatRound, CultivationPathId, EnemyVisualType, PendingCombat } from '../../models'

export interface CombatVisualProfile {
  id: CultivationPathId
  className: string
  effectLabel: string
  motion: 'swift' | 'steady' | 'impact' | 'feral' | 'ethereal'
}

const PATH_VISUALS: Record<CultivationPathId, CombatVisualProfile> = {
  sword: { id: 'sword', className: 'path-sword', effectLabel: '剑光纵横', motion: 'swift' },
  body: { id: 'body', className: 'path-body', effectLabel: '拳罡震地', motion: 'impact' },
  dao: { id: 'dao', className: 'path-dao', effectLabel: '法印流转', motion: 'steady' },
  demonic: { id: 'demonic', className: 'path-demonic', effectLabel: '魔焰血雾', motion: 'feral' },
  ghost: { id: 'ghost', className: 'path-ghost', effectLabel: '阴魂蚀骨', motion: 'ethereal' },
}

export function combatVisualProfile(path?: CultivationPathId) {
  return PATH_VISUALS[path ?? 'dao']
}

export function enemyVisualType(enemy: PendingCombat['enemy']): EnemyVisualType {
  if (enemy.type === 'beast') return /狼/.test(enemy.name) ? 'wolf' : 'beast'
  if (enemy.path === 'ghost' || /鬼|魂|阴灵/.test(enemy.name)) return 'ghost'
  if (enemy.path === 'demonic' || /魔|血衣/.test(enemy.name)) return 'demonic'
  if (/劫修|夺宝|截道/.test(enemy.name)) return 'rogue'
  return 'cultivator'
}

export function combatDisplayAssessment(label: string) {
  if (label === '远强') return { label: '碾压', detail: '你的气势远胜对手，此战仍需提防意外手段。', tone: 'safe' }
  if (label === '略强') return { label: '占优', detail: '你占据明显优势，但修仙斗法从无绝对。', tone: 'safe' }
  if (label === '势均力敌') return { label, detail: '双方底蕴接近，策略、克制与底牌将左右胜负。', tone: 'even' }
  if (label === '略弱' || label === '强敌') return { label: '强敌', detail: '对方实力明显高于你，强行交战存在较大风险。', tone: 'danger' }
  return { label: '不可力敌', detail: '敌我差距悬殊，拼命也可能只有一线生机。', tone: 'fatal' }
}

export function combatInjuryFromHealth(current: number, maximum: number, dead = false): NonNullable<CombatRecord['injury']> {
  if (dead) return 'death'
  const ratio = current / Math.max(1, maximum)
  if (ratio <= .08) return 'near-death'
  if (ratio <= .3) return 'serious'
  if (ratio <= .7) return 'injured'
  return 'none'
}

export function playbackRounds(rounds: CombatRound[], visibleCount: number, skipped = false) {
  return skipped ? rounds : rounds.slice(0, Math.max(0, visibleCount))
}
