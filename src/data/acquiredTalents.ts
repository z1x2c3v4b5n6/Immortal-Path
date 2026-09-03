import type { CultivationPathId } from '../models'

export type AcquiredTalentRequirement =
  | { type: 'fiveElementBalance'; value: number }
  | { type: 'allStandardGrowth'; value: number }
  | { type: 'innateRootCount'; value: number }
  | { type: 'realmIndex'; value: number }
  | { type: 'primaryPath'; pathId: CultivationPathId }
  | { type: 'stat'; stat: 'comprehension' | 'luck' | 'constitution' | 'soul' | 'charm'; value: number }
  | { type: 'pathLevel'; pathId: CultivationPathId; value: number }
  | { type: 'counter'; key: 'nearDeathCount' | 'dangerousEventCount' | 'severeInjuryCount' | 'luckyOutcomeStreak' | 'rareEventCount' | 'lateMajorBreakthroughs'; value: number }
  | { type: 'pathResource'; key: 'swordIntent' | 'demonicNature' | 'innerDemon'; min?: number; max?: number }

export interface AcquiredTalentDefinition {
  id: string
  name: string
  description: string
  requirements: AcquiredTalentRequirement[]
  requiresEvent?: string
  effects: { type: string; value: number; description: string }[]
  reincarnationUnlock?: string
}

export const ACQUIRED_TALENTS: AcquiredTalentDefinition[] = [
  { id: 'five-unity', name: '五行归一', description: '五行根基齐备且均衡，道法浑然一体。', requirements: [{ type: 'innateRootCount', value: 5 }, { type: 'allStandardGrowth', value: 80 }, { type: 'fiveElementBalance', value: 90 }, { type: 'realmIndex', value: 11 }], requiresEvent: 'five-unity-insight', effects: [{ type: 'fiveElementAffinity', value: 15, description: '五行功法契合 +15' }, { type: 'breakthrough', value: .08, description: '大境界突破稳定性 +8%' }], reincarnationUnlock: 'five-element-seed' },
  { id: 'sword-heart', name: '剑心通明', description: '剑道精深，心念与剑意相照。', requirements: [{ type: 'primaryPath', pathId: 'sword' }, { type: 'pathLevel', pathId: 'sword', value: 8 }, { type: 'pathResource', key: 'swordIntent', min: 80 }, { type: 'stat', stat: 'comprehension', value: 75 }], requiresEvent: 'sword-heart-insight', effects: [{ type: 'swordAffinity', value: 14, description: '剑道功法契合提高' }] },
  { id: 'battle-body', name: '百战之躯', description: '于凶险中千锤百炼的肉身。', requirements: [{ type: 'primaryPath', pathId: 'body' }, { type: 'pathLevel', pathId: 'body', value: 6 }, { type: 'stat', stat: 'constitution', value: 80 }, { type: 'counter', key: 'dangerousEventCount', value: 8 }, { type: 'counter', key: 'severeInjuryCount', value: 3 }], effects: [{ type: 'constitutionPotential', value: 8, description: '体魄潜力提高' }] },
  { id: 'nine-lives', name: '九死一生', description: '数度濒死而不灭，命数愈发坚韧。', requirements: [{ type: 'counter', key: 'nearDeathCount', value: 9 }], effects: [{ type: 'dangerSurvival', value: .08, description: '危险事件生存率略升' }] },
  { id: 'late-bloom', name: '大器晚成', description: '高龄之后接连破境，厚积薄发。', requirements: [{ type: 'counter', key: 'lateMajorBreakthroughs', value: 2 }], effects: [{ type: 'agingRelief', value: .5, description: '高龄惩罚减半' }] },
  { id: 'demon-heart', name: '魔心无垢', description: '身负高魔性与危险心魔，渡过心劫后反得澄明。', requirements: [{ type: 'primaryPath', pathId: 'demonic' }, { type: 'pathLevel', pathId: 'demonic', value: 7 }, { type: 'pathResource', key: 'demonicNature', min: 70 }, { type: 'pathResource', key: 'innerDemon', min: 35 }], requiresEvent: 'demon-heart-trial', effects: [{ type: 'demonicStability', value: .12, description: '魔功风险降低' }] },
  { id: 'defy-fate', name: '逆天改命', description: '大限将至时突破大境界，硬生生改写命数。', requirements: [{ type: 'counter', key: 'nearDeathCount', value: 1 }], requiresEvent: 'defy-fate-breakthrough', effects: [{ type: 'lifespanEvent', value: .12, description: '寿元机缘略有优势' }], reincarnationUnlock: 'late' },
  { id: 'heaven-chosen', name: '天眷之人', description: '高品质机缘连续加身，仿佛天地垂青。', requirements: [{ type: 'counter', key: 'rareEventCount', value: 8 }, { type: 'counter', key: 'luckyOutcomeStreak', value: 5 }, { type: 'stat', stat: 'luck', value: 80 }], requiresEvent: 'mandate-revelation', effects: [{ type: 'rareEventWeight', value: .12, description: '稀有事件权重提高' }] },
]

export const acquiredTalentById = (id: string) => ACQUIRED_TALENTS.find((talent) => talent.id === id)
