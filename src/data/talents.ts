import type { TalentDefinition, TalentInstance } from '../models'

export const TALENTS: TalentDefinition[] = [
  { id: 'longevity', name: '长寿', quality: '普通', cost: 1, description: '最大寿元 +10%。', effects: [{ type: 'lifespanMultiplier', value: .1 }], firstGenerationAvailable: true },
  { id: 'clever', name: '聪慧', quality: '普通', cost: 1, description: '悟性 +8。', effects: [{ type: 'stat', stat: 'comprehension', value: 8 }], firstGenerationAvailable: true },
  { id: 'fortune', name: '福缘', quality: '普通', cost: 1, description: '气运 +8。', effects: [{ type: 'stat', stat: 'luck', value: 8 }], firstGenerationAvailable: true },
  { id: 'strong', name: '强健', quality: '普通', cost: 1, description: '体魄 +8。', effects: [{ type: 'stat', stat: 'constitution', value: 8 }], firstGenerationAvailable: true },
  { id: 'soul-stable', name: '神魂稳固', quality: '普通', cost: 1, description: '神识 +8。', effects: [{ type: 'stat', stat: 'soul', value: 8 }], firstGenerationAvailable: true },
  { id: 'handsome', name: '天生俊朗', quality: '普通', cost: 1, description: '魅力 +8。', effects: [{ type: 'stat', stat: 'charm', value: 8 }], firstGenerationAvailable: true },
  { id: 'diligent', name: '勤修不辍', quality: '普通', cost: 1, description: '修炼效率 +5%。', effects: [{ type: 'cultivationMultiplier', value: .05 }], firstGenerationAvailable: true },
  { id: 'calm', name: '心如止水', quality: '普通', cost: 1, description: '突破成功率 +3%。', effects: [{ type: 'breakthroughBonus', value: .03 }], firstGenerationAvailable: true },
  { id: 'wanderer', name: '山野有缘', quality: '普通', cost: 1, description: '历练事件权重略微提高。', effects: [{ type: 'eventWeight', value: .08 }], firstGenerationAvailable: true },
  { id: 'frugal', name: '克勤克俭', quality: '普通', cost: 1, description: '未来经营家业时略有优势。', effects: [{ type: 'future', value: 1 }], firstGenerationAvailable: true },
  { id: 'early', name: '早慧', quality: '优秀', cost: 2, description: '年轻阶段修炼效率提高。', effects: [{ type: 'cultivationMultiplier', value: .08 }], firstGenerationAvailable: true },
  { id: 'memory', name: '过目不忘', quality: '优秀', cost: 3, description: '悟性 +10，未来功法学习收益提高。', effects: [{ type: 'stat', stat: 'comprehension', value: 10 }, { type: 'future', value: 1 }], firstGenerationAvailable: true },
  { id: 'social', name: '长袖善舞', quality: '优秀', cost: 2, description: '魅力 +8，关系类事件略有优势。', effects: [{ type: 'stat', stat: 'charm', value: 8 }, { type: 'eventWeight', value: .05 }], firstGenerationAvailable: true },
  { id: 'hardy', name: '铜皮铁骨', quality: '优秀', cost: 2, description: '体魄 +6，最大寿元 +5%。', effects: [{ type: 'stat', stat: 'constitution', value: 6 }, { type: 'lifespanMultiplier', value: .05 }], firstGenerationAvailable: true },
  { id: 'steadfast', name: '道心坚定', quality: '优秀', cost: 2, description: '修炼效率与突破率小幅提高。', effects: [{ type: 'cultivationMultiplier', value: .04 }, { type: 'breakthroughBonus', value: .03 }], firstGenerationAvailable: true },
  { id: 'sword', name: '天生剑骨', quality: '稀有', cost: 4, description: '剑道相关成长与突破大幅提高。', effects: [{ type: 'breakthroughBonus', value: .08 }, { type: 'future', value: 2 }], unlockRequirement: { type: 'achievement', value: '证得金丹', description: '任意一世证得金丹' }, firstGenerationAvailable: false },
  { id: 'great-fortune', name: '福缘深厚', quality: '稀有', cost: 4, description: '高品质事件权重显著提高。', effects: [{ type: 'stat', stat: 'luck', value: 12 }, { type: 'eventWeight', value: .22 }], unlockRequirement: { type: 'generation', value: 2, description: '完成第一世' }, firstGenerationAvailable: false },
  { id: 'late', name: '大器晚成', quality: '稀有', cost: 4, description: '早年略慢，中晚年修炼与突破显著提高。', effects: [{ type: 'cultivationMultiplier', value: .12 }, { type: 'breakthroughBonus', value: .06 }], unlockRequirement: { type: 'generation', value: 3, description: '完成两次人生' }, firstGenerationAvailable: false },
  { id: 'dan-heart', name: '丹心天成', quality: '稀有', cost: 4, description: '未来炼丹系统中拥有显著优势。', effects: [{ type: 'future', value: 3 }], unlockRequirement: { type: 'achievement', value: '丹道因果', description: '尚未满足丹道因果' }, firstGenerationAvailable: false },
  { id: 'dao-body', name: '先天道体', quality: '极品', cost: 6, description: '综合修炼优势，体魄与悟性兼备。', effects: [{ type: 'stat', stat: 'constitution', value: 10 }, { type: 'stat', stat: 'comprehension', value: 10 }, { type: 'cultivationMultiplier', value: .16 }], unlockRequirement: { type: 'achievement', value: '证得元婴', description: '任意一世证得元婴' }, firstGenerationAvailable: false },
  { id: 'heaven-luck', name: '鸿运齐天', quality: '极品', cost: 7, description: '特殊奇遇权重显著提高。', effects: [{ type: 'stat', stat: 'luck', value: 18 }, { type: 'eventWeight', value: .4 }], unlockRequirement: { type: 'rareEvents', value: 8, description: '累计获得八次稀有机缘' }, firstGenerationAvailable: false },
  { id: 'immortal-soul', name: '不灭元神', quality: '传说', cost: 9, description: '强大的轮回相关潜能。', effects: [{ type: 'stat', stat: 'soul', value: 20 }, { type: 'future', value: 5 }], unlockRequirement: { type: 'generation', value: 8, description: '完成七次人生' }, firstGenerationAvailable: false },
  { id: 'five-element-seed', name: '五行道种', quality: '传说', cost: 9, description: '由后天五行归一的因果凝成，下一世更易驾驭五行功法。', effects: [{ type: 'cultivationMultiplier', value: .12 }, { type: 'future', value: 5 }], unlockRequirement: { type: 'achievement', value: '后天五行归一', description: '曾在一世中获得「五行归一」' }, firstGenerationAvailable: false },
]

export const talentById = (id: string) => TALENTS.find((talent) => talent.id === id)
export const instantiateTalent = (definition: TalentDefinition, generation: number): TalentInstance => ({ ...definition, effects: definition.effects.map((effect) => ({ ...effect })), acquiredGeneration: generation })
