import { BodyRealm, CultivationAction, type ActionResultType } from '../../models'

export interface CultivationActionDefinition {
  id: CultivationAction
  name: string
  glyph: string
  description: string
  durationOptions: number[]
  defaultDuration: number
  resultTypes: ActionResultType[]
}

export const CULTIVATION_ACTIONS: CultivationActionDefinition[] = [
  { id: CultivationAction.MEDITATION, name: '闭关', glyph: '闭', description: '潜心吐纳，增长修为、功法经验与突破准备。', durationOptions: [1, 3, 5], defaultDuration: 5, resultTypes: ['ordinary', 'technique-breakthrough', 'insight', 'bottleneck', 'inner-demon'] },
  { id: CultivationAction.ADVENTURE, name: '历练', glyph: '险', description: '进入危险地域，争取灵药、妖丹与特殊机缘。', durationOptions: [1, 2, 3], defaultDuration: 1, resultTypes: ['resource', 'danger'] },
  { id: CultivationAction.ENLIGHTENMENT, name: '悟道', glyph: '悟', description: '参悟功法与自身大道，推动元素、道途和瓶颈感悟。', durationOptions: [1, 3], defaultDuration: 1, resultTypes: ['insight', 'technique-breakthrough'] },
  { id: CultivationAction.BODY_TRAINING, name: '炼体', glyph: '体', description: '以气血淬炼皮肉筋骨，推进肉身境界。', durationOptions: [1, 3], defaultDuration: 1, resultTypes: ['ordinary', 'resource', 'danger'] },
  { id: CultivationAction.TRAVEL, name: '游历', glyph: '游', description: '行走天下，增加人物、因果、商旅与秘境事件的机会。', durationOptions: [1, 2, 3], defaultDuration: 2, resultTypes: ['resource', 'insight'] },
  { id: CultivationAction.RECOVERY, name: '休养', glyph: '养', description: '调息疗伤，平复心魔，恢复气血与魂体稳定。', durationOptions: [1, 2], defaultDuration: 1, resultTypes: ['recovery'] },
]

export const BODY_REALM_ORDER = [BodyRealm.SKIN, BodyRealm.FLESH, BodyRealm.BONE, BodyRealm.VISCERA, BodyRealm.BLOOD, BodyRealm.GOLDEN_BODY]
export const BODY_REALM_NAMES: Record<BodyRealm, string> = {
  [BodyRealm.SKIN]: '炼皮', [BodyRealm.FLESH]: '炼肉', [BodyRealm.BONE]: '炼骨', [BodyRealm.VISCERA]: '炼脏', [BodyRealm.BLOOD]: '换血', [BodyRealm.GOLDEN_BODY]: '金身',
}
export const BODY_REALM_THRESHOLDS = [0, 100, 250, 450, 700, 1000]

export const actionById = (id: CultivationAction) => CULTIVATION_ACTIONS.find((action) => action.id === id)!
