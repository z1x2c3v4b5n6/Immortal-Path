import type { CultivationPathId, SectPosition, SectType } from '../../models'

export const SECT_RANK_NAMES = ['不入流', '小宗门', '中型宗门', '大型宗门', '顶级圣地'] as const
export const SECT_POSITIONS: SectPosition[] = ['杂役弟子', '外门弟子', '内门弟子', '真传弟子', '长老', '太上长老']

export const SECT_TYPE_PATH: Record<SectType, CultivationPathId> = {
  剑宗: 'sword', 丹宗: 'dao', 器宗: 'dao', 佛门: 'body', 魔宗: 'demonic', 鬼宗: 'ghost', 体宗: 'body', 散修联盟: 'dao',
}

export const SECT_STYLES: Record<SectType, string> = {
  剑宗: '重锋芒与剑心，以同境攻伐闻名。', 丹宗: '精于灵药丹火，以资源和人脉立足。', 器宗: '擅炼法器阵盘，占据多处灵矿。', 佛门: '持戒炼体，重因果与护生。',
  魔宗: '进境迅猛，门规残酷，以强者为尊。', 鬼宗: '依阴脉而立，精研神魂与幽冥秘术。', 体宗: '熬炼气血肉身，崇尚正面争锋。', 散修联盟: '来者不问出身，以交易互助维系。',
}

export function sectPositionForRealm(realmIndex: number, contribution = 0): SectPosition {
  if (realmIndex >= 35) return '太上长老'
  if (realmIndex >= 19) return '长老'
  if (realmIndex >= 11 && contribution >= 500) return '真传弟子'
  if (realmIndex >= 11) return '内门弟子'
  if (realmIndex >= 1) return '外门弟子'
  return '杂役弟子'
}

export function sectRankName(rank: number) { return SECT_RANK_NAMES[Math.max(0, Math.min(4, Math.round(rank)))] }

