import type { Talent } from '../models'

export const TALENTS: Talent[] = [
  { id: 'sword', name: '天生剑骨', description: '破境更为锐利。', breakthroughBonus: 0.06 },
  { id: 'dan-heart', name: '丹心', description: '修炼心境澄明。', cultivationMultiplier: 1.14 },
  { id: 'longevity', name: '长寿', description: '天生寿数绵长。', lifespanYears: 24 },
  { id: 'fortune', name: '福缘深厚', description: '好事更容易找上门。', statChanges: { luck: 12 } },
  { id: 'memory', name: '过目不忘', description: '悟法速度更快。', statChanges: { comprehension: 10 } },
  { id: 'strong', name: '体魄强健', description: '筋骨强韧，寿数略增。', statChanges: { constitution: 10 }, lifespanYears: 8 },
  { id: 'early', name: '早慧', description: '少年时便通晓事理。', cultivationMultiplier: 1.08, statChanges: { comprehension: 5 } },
  { id: 'late', name: '大器晚成', description: '起步稍慢，破境更稳。', cultivationMultiplier: 0.94, breakthroughBonus: 0.09 },
  { id: 'solitary', name: '天煞孤星', description: '福祸相依，神魂强盛。', statChanges: { charm: -9, soul: 15, luck: 4 } },
  { id: 'steadfast', name: '道心坚定', description: '修行与破境皆更稳定。', cultivationMultiplier: 1.06, breakthroughBonus: 0.04 },
  { id: 'frail', name: '先天不足', description: '悟性过人，体魄孱弱。', statChanges: { constitution: -12, comprehension: 14 }, lifespanYears: -10 },
  { id: 'wanderer', name: '闲云野鹤', description: '不拘俗礼，气运多变。', statChanges: { charm: 7, luck: 6 } },
]
