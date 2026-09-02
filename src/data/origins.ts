import type { Origin } from '../models'

export const ORIGINS: Origin[] = [
  { id: 'farmer', name: '农户之子', description: '筋骨扎实，识字不多。', stones: 2, statChanges: { constitution: 8 }, rootLuck: 0 },
  { id: 'hunter', name: '猎户之家', description: '熟悉山野，也知敬畏。', stones: 4, statChanges: { constitution: 6, luck: 3 }, rootLuck: 0 },
  { id: 'merchant', name: '商贾之家', description: '家资尚可，耳目灵通。', stones: 20, statChanges: { charm: 7 }, rootLuck: 0 },
  { id: 'scholar', name: '书香门第', description: '自幼读经，悟性不俗。', stones: 6, statChanges: { comprehension: 9 }, rootLuck: 1 },
  { id: 'fallen', name: '没落修仙家族', description: '旧谱中还留着引气法门。', stones: 18, statChanges: { soul: 7 }, rootLuck: 4 },
  { id: 'clan', name: '修仙世家', description: '在灵气与期许中长大。', stones: 45, statChanges: { comprehension: 4, luck: 4 }, rootLuck: 8 },
  { id: 'mystery', name: '神秘弃婴', description: '身世空白，命数难测。', stones: 1, statChanges: { luck: 11, soul: 5 }, rootLuck: 6 },
  { id: 'sect', name: '宗门后裔', description: '出生便在山门之内。', stones: 32, statChanges: { comprehension: 6, charm: 5 }, rootLuck: 7 },
]
