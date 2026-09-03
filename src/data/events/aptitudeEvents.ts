import type { EventEffect, GameEvent, SpiritElement } from '../../models'

const STANDARD_GROWTH_EFFECTS: EventEffect[] = (['金', '木', '水', '火', '土'] as SpiritElement[]).map((element) => ({ type: 'elementalGrowth', element, value: 1, text: `${element}行感悟圆融一分。` }))

const rootEvent = (id: string, title: string, description: string, element: SpiritElement, source: string, purity: number, stability: number, minRealmIndex = 4): GameEvent => ({
  id, title, description, weight: 2, minRealmIndex,
  options: [
    { id: 'accept', label: '纳入灵脉', outcomes: [{ id: 'success', weight: 1, tags: ['rare'], resultText: `你获得了后天${element}灵根。`, effects: [{ type: 'acquireRoot', element, purity, stability, source, text: `${source}使后天${element}灵根在体内扎根。` }] }] },
    { id: 'leave', label: '守住本心', outcomes: [{ id: 'leave', weight: 1, resultText: '你没有贸然改变自身根基。', effects: [] }] },
  ],
})

export const APTITUDE_EVENTS: GameEvent[] = [
  rootEvent('root-treasure', '地脉灵珠', '一枚地脉灵珠蕴含纯粹土行本源，可重塑一缕灵脉。', '土', '天材地宝', 68, 72),
  rootEvent('root-tribulation', '雷劫留痕', '劫雷散去后，一缕雷意仍在经脉中奔涌。', '雷', '雷劫淬体', 75, 48, 12),
  rootEvent('root-inheritance', '寒宫传承', '秘境深处的冰棺中封存着一份改易灵根的传承。', '冰', '秘境传承', 82, 80, 8),
  rootEvent('root-bloodline', '血脉苏醒', '沉睡的血脉在生死关头苏醒，带来一缕风灵本源。', '风', '血脉觉醒', 72, 85, 6),
  { id: 'root-demonic-theft', title: '夺灵邪仪', description: '魔道石台可从残魂中夺取暗灵根，但根基极不稳定。', weight: 2, minRealmIndex: 8, pathRequirements: ['demonic'], options: [{ id: 'steal', label: '强行夺灵', outcomes: [{ id: 'success', weight: 1, tags: ['rare', 'danger'], resultText: '暗灵根落入体内，心魔与业力也随之滋长。', effects: [{ type: 'acquireRoot', element: '暗', purity: 62, stability: 25, source: '魔道夺灵', text: '夺来一条不稳定的后天暗灵根。' }, { type: 'pathResource', resource: 'innerDemon', value: 15, text: '夺灵使心魔滋长。' }, { type: 'pathResource', resource: 'karma', value: 18, text: '夺灵恶业缠身。' }] }] }, { id: 'leave', label: '毁去邪仪', outcomes: [{ id: 'leave', weight: 1, resultText: '你没有踏出这一步。', effects: [] }] }] },
  rootEvent('root-reincarnation-residue', '前尘道痕', '轮回深处残留的光明道痕回应了今世神魂。', '光', '轮回残留', 88, 68, 10),
  { id: 'root-purification', title: '灵泉洗脉', description: '温和灵泉可缓慢提纯一条后天灵根。', weight: 3, minRealmIndex: 5, options: [{ id: 'purify', label: '洗炼根基', outcomes: [{ id: 'success', weight: 1, tags: ['insight'], resultText: '后天灵根的杂质被洗去少许。', effects: [{ type: 'purifyRoot', value: 4, text: '后天灵根纯度缓慢提升。' }, { type: 'stabilizeRoot', value: 3, text: '后天灵根变得更加稳定。' }] }] }] },
  { id: 'sword-heart-insight', title: '剑心照影', description: '万千剑影归于一念，唯有真正的剑修能够照见本心。', weight: 1, minRealmIndex: 8, pathRequirements: ['sword'], options: [{ id: 'insight', label: '直面剑心', outcomes: [{ id: 'success', weight: 1, tags: ['insight'], resultText: '剑心清明，再无滞碍。', effects: [{ type: 'pathExperience', pathId: 'sword', value: 120, text: '剑道感悟大进。' }] }] }] },
  { id: 'five-unity-insight', title: '五行顿悟', description: '五色灵光在周天中轮转，相生之机只差最后一念。', weight: 1, minRealmIndex: 11, options: [{ id: 'insight', label: '令五行归一', outcomes: [{ id: 'success', weight: 1, tags: ['insight'], resultText: '五行轮转，大道初成。', effects: STANDARD_GROWTH_EFFECTS }] }] },
  { id: 'demon-heart-trial', title: '无垢心劫', description: '心魔化作万千幻象，唯有驾驭它才能不被魔性吞没。', weight: 1, minRealmIndex: 12, pathRequirements: ['demonic'], options: [{ id: 'endure', label: '炼魔归心', outcomes: [{ id: 'success', weight: 1, tags: ['danger', 'insight'], resultText: '魔性仍在，心镜却澄明无垢。', effects: [{ type: 'pathResource', resource: 'innerDemon', value: -25, text: '心魔暂时平息。' }] }] }] },
  { id: 'mandate-revelation', title: '天命显兆', description: '连续的机缘最终汇成一道命数昭示。', weight: 1, minRealmIndex: 8, options: [{ id: 'receive', label: '承接天命', outcomes: [{ id: 'success', weight: 1, tags: ['rare'], resultText: '你承接了这一缕天命。', effects: [{ type: 'stat', stat: 'luck', value: 2, text: '天命加身，气运增长。' }] }] }] },
]
