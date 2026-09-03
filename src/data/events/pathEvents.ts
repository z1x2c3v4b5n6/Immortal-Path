import type { CultivationPathId, EventEffect, GameEvent, PathResources } from '../../models'

interface PathEventSeed { id: string; title: string; description: string; choice: string; effects: EventEffect[]; resource?: keyof PathResources }

const seeds: Record<CultivationPathId, PathEventSeed[]> = {
  dao: [
    { id: 'dao-cloud-altar', title: '云台论法', description: '散修在云台交换修行心得。', choice: '静听百家', effects: [{ type: 'cultivation', value: 220, text: '百家之言互相印证。' }] },
    { id: 'dao-talisman', title: '无字道符', description: '一张无字黄符悬于古松之间。', choice: '以神识观符', effects: [{ type: 'stat', stat: 'soul', value: 2, text: '符意温养神魂。' }] },
    { id: 'dao-starlight', title: '周天星图', description: '星辉在石壁上汇成周天运转之形。', choice: '推演周天', effects: [{ type: 'stat', stat: 'comprehension', value: 2, text: '悟性有所精进。' }] },
    { id: 'dao-spirit-tide', title: '灵潮入谷', description: '天地灵气忽如潮水涌入山谷。', choice: '顺势吐纳', effects: [{ type: 'cultivation', value: 360, text: '经脉纳入大量灵气。' }] },
    { id: 'dao-old-scripture', title: '古经残页', description: '残页所记似是失传的导引法。', choice: '参研古经', effects: [{ type: 'lifespan', value: 12, text: '气息绵长，寿元略增。' }] },
  ],
  sword: [
    { id: 'sword-tomb', title: '荒山剑冢', description: '万柄残剑在风中低鸣。', choice: '聆听剑鸣', effects: [], resource: 'swordIntent' },
    { id: 'sword-broken', title: '断剑遗意', description: '一截断剑仍存不屈剑意。', choice: '握住断剑', effects: [{ type: 'stat', stat: 'comprehension', value: 2, text: '你看见昔日一剑。' }], resource: 'swordIntent' },
    { id: 'sword-stele', title: '无名剑碑', description: '碑上只有一道直入云霄的刻痕。', choice: '观碑悟剑', effects: [], resource: 'swordIntent' },
    { id: 'sword-challenge', title: '白衣问剑', description: '白衣剑客请你以剑意相证。', choice: '应下此战', effects: [{ type: 'cultivation', value: 260, text: '一战之后，道行精进。' }], resource: 'swordIntent' },
    { id: 'sword-rain', title: '雨中练剑', description: '每一滴雨都像一柄坠落的小剑。', choice: '挥剑截雨', effects: [], resource: 'swordIntent' },
  ],
  body: [
    { id: 'body-blood', title: '古兽精血', description: '石罐中封存着一滴古兽精血。', choice: '炼入肉身', effects: [{ type: 'stat', stat: 'constitution', value: 2, text: '筋骨轰鸣，体魄增强。' }], resource: 'qiBlood' },
    { id: 'body-ruin', title: '炼体遗迹', description: '石室中遍布沉重铜人。', choice: '负重淬体', effects: [{ type: 'stat', stat: 'constitution', value: 2, text: '苦修令肉身更坚韧。' }], resource: 'qiBlood' },
    { id: 'body-master', title: '武道强者', description: '赤膊老人一拳击碎山岩。', choice: '请教拳理', effects: [], resource: 'qiBlood' },
    { id: 'body-waterfall', title: '千钧瀑布', description: '瀑流重若千钧，寻常人无法立足。', choice: '入瀑站桩', effects: [{ type: 'stat', stat: 'constitution', value: 1, text: '血肉适应了重压。' }], resource: 'qiBlood' },
    { id: 'body-beast', title: '巨兽遗骨', description: '山谷中横卧着不知年代的巨骨。', choice: '感悟骨纹', effects: [], resource: 'qiBlood' },
  ],
  demonic: [
    { id: 'demonic-whisper', title: '血影低语', description: '血色影子许诺一条更快、更险的修行之路。', choice: '接受魔道传承', effects: [{ type: 'unlockPath', pathId: 'demonic', text: '魔修道途已开启。' }] },
    { id: 'demonic-pool', title: '无主血池', description: '血池中蕴含霸道而驳杂的力量。', choice: '炼化血气', effects: [{ type: 'cultivation', value: 520, text: '修为暴涨，心境却染上一丝阴影。' }], resource: 'demonicNature' },
    { id: 'demonic-manual', title: '噬元魔功', description: '黑色玉简记载着吞噬修为的残法。', choice: '强记残法', effects: [], resource: 'innerDemon' },
    { id: 'demonic-heart', title: '心魔照影', description: '镜中映出你最不愿承认的欲念。', choice: '直面心魔', effects: [{ type: 'stat', stat: 'soul', value: 2, text: '神魂在撕裂中变得坚韧。' }], resource: 'innerDemon' },
    { id: 'demonic-hunt', title: '正道追索', description: '远处剑光封锁山路，显然为你而来。', choice: '冒险突围', effects: [{ type: 'cultivation', value: 380, text: '生死之间魔功大进。' }], resource: 'karma' },
  ],
  ghost: [
    { id: 'ghost-crystal', title: '幽谷魂晶', description: '阴风中凝结出一枚清澈魂晶。', choice: '吸收阴气', effects: [{ type: 'soulStability', value: 12, text: '魂体重新凝实。' }] },
    { id: 'ghost-tomb', title: '古墓夜语', description: '墓中亡魂诉说百年前的秘密。', choice: '聆听遗言', effects: [{ type: 'stat', stat: 'soul', value: 2, text: '百年执念磨砺神识。' }] },
    { id: 'ghost-incense', title: '孤庙香火', description: '一缕无人供奉的香火飘向你的魂体。', choice: '承接香火', effects: [{ type: 'soulStability', value: 9, text: '香火稳住魂魄。' }] },
    { id: 'ghost-river', title: '忘川支流', description: '幽暗河水映出无数前尘。', choice: '守住真名', effects: [{ type: 'cultivation', value: 320, text: '前尘化作鬼道资粮。' }] },
    { id: 'ghost-lantern', title: '引魂古灯', description: '古灯青焰照亮一条阴间旧路。', choice: '借灯温魂', effects: [{ type: 'soulStability', value: 15, text: '青焰修补了魂体裂隙。' }] },
  ],
}

export const PATH_EVENTS: GameEvent[] = (Object.entries(seeds) as Array<[CultivationPathId, PathEventSeed[]]>).flatMap(([pathId, entries]) => entries.map((seed, index) => ({
  id: seed.id,
  title: seed.title,
  description: seed.description,
  weight: pathId === 'demonic' && index === 0 ? 2 : 3,
  minRealmIndex: 1,
  pathRequirements: pathId === 'demonic' && index === 0 ? undefined : [pathId],
  pathWeights: { [pathId]: 2.5 },
  options: [
    { id: 'embrace', label: seed.choice, outcomes: [{ id: 'success', weight: 82, effects: [...seed.effects, { type: 'pathExperience', pathId, value: 45, text: `${pathId === 'dao' ? '道修' : pathId === 'sword' ? '剑修' : pathId === 'body' ? '体修' : pathId === 'demonic' ? '魔修' : '鬼修'}经验增加。` }, ...(seed.resource ? [{ type: 'pathResource' as const, resource: seed.resource, value: seed.resource === 'innerDemon' || seed.resource === 'karma' ? 5 : 18, text: '道途资源发生变化。' }] : [])], resultText: `${seed.title}的机缘已融入你的道途。`, tags: ['insight'] }] },
    { id: 'leave', label: '谨慎离开', outcomes: [{ id: 'leave', weight: 1, effects: [], resultText: '你没有触碰这份因果。' }] },
  ],
})))
