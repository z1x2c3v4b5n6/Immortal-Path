import type { ProfessionId } from '../models'

export const PROFESSION_NAMES: Record<ProfessionId, string> = { ALCHEMY: '丹道', REFINING: '器道', COMMERCE: '商道' }

export function professionTitle(level: number) {
  return level >= 95 ? '宗师' : level >= 80 ? '大师' : level >= 60 ? '精通' : level >= 40 ? '熟练' : level >= 20 ? '入门' : '初学'
}
