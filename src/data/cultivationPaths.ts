import type { CultivationPathId } from '../models'

export interface CultivationPathDefinition {
  id: CultivationPathId
  name: string
  glyph: string
  description: string
  cultivationMultiplier: number
  lifespanMultiplier: number
  unlockHint: string
}

export const CULTIVATION_PATHS: CultivationPathDefinition[] = [
  { id: 'dao', name: '道修', glyph: '道', description: '稳定传统，兼容广泛，突破最为从容。', cultivationMultiplier: 1.04, lifespanMultiplier: 1, unlockHint: '炼气后可选' },
  { id: 'sword', name: '剑修', glyph: '剑', description: '修为略缓，以悟性锤炼剑意与剑心。', cultivationMultiplier: .95, lifespanMultiplier: 1, unlockHint: '炼气后可选' },
  { id: 'body', name: '体修', glyph: '体', description: '以气血淬炼肉身，少依赖灵根，寿元更长。', cultivationMultiplier: .92, lifespanMultiplier: 1.1, unlockHint: '炼气后可选' },
  { id: 'demonic', name: '魔修', glyph: '魔', description: '修行迅猛却滋生心魔与业力，可用寿元换道行。', cultivationMultiplier: 1.24, lifespanMultiplier: .96, unlockHint: '需特殊机缘开启' },
  { id: 'ghost', name: '鬼修', glyph: '鬼', description: '舍弃肉身，以魂体稳定度维系存在。', cultivationMultiplier: 1.05, lifespanMultiplier: 1, unlockHint: '死亡后魂魄不散' },
]

export const PATH_COMPATIBILITY: Record<CultivationPathId, Partial<Record<CultivationPathId, number>>> = {
  dao: { sword: 1, body: .85, demonic: .35, ghost: .5 },
  sword: { dao: 1, body: .7, demonic: .45, ghost: .45 },
  body: { dao: .85, sword: .7, demonic: .9, ghost: .35 },
  demonic: { dao: .35, sword: .45, body: .9, ghost: .8 },
  ghost: { dao: .5, sword: .45, body: .35, demonic: .8 },
}

export const pathById = (id?: CultivationPathId) => CULTIVATION_PATHS.find((path) => path.id === id)
export const pathExperienceForLevel = (level: number) => Math.max(0, level - 1) ** 2 * 100
export const bodyStageName = (stage: number) => ['炼皮', '炼肉', '炼骨', '炼脏', '换血', '金身'][Math.max(0, Math.min(5, stage))]
export const swordIntentName = (intent: number) => ['剑术', '剑气', '剑意', '剑心', '剑域'][Math.max(0, Math.min(4, Math.floor(intent / 120)))]
