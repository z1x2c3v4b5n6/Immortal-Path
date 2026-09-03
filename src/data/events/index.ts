import type { EventEffect, GameEvent } from '../../models'
import { PATH_EVENTS } from './pathEvents'

type EventSeed = [string, string, string, string, EventEffect[], string, EventEffect[]]

const seeds: EventSeed[] = [
  ['cave', '荒山洞府', '山雨过后，一座封闭多年的洞府露出石门。', '推门而入', [{ type: 'cultivation', value: 180, text: '石壁心得令你修为精进。' }, { type: 'item', itemId: 'map', text: '拾得一张残缺秘境图。' }], '谨慎搜寻', [{ type: 'stones', value: 18, text: '在碎石间发现灵石。' }]],
  ['old-man', '松下老人', '白发老人独坐松下，邀你共弈一局。', '落子无悔', [{ type: 'stat', stat: 'comprehension', value: 3, text: '棋局暗合天地至理，悟性提升。' }], '奉茶请教', [{ type: 'cultivation', value: 120, text: '老人随口点拨了几句。' }]],
  ['market', '山中鬼市', '月下灯火连成一线，往来者皆戴面具。', '以物易物', [{ type: 'item', itemId: 'ancient-coin', text: '换得一枚上古道钱。' }], '只作旁观', [{ type: 'stones', value: 12, text: '替摊主解围，获赠灵石。' }]],
  ['rain', '灵雨天降', '云层泛起青光，草木一夜疯长。', '沐雨吐纳', [{ type: 'cultivation', value: 240, text: '灵雨洗涤经脉。' }], '采集灵草', [{ type: 'item', itemId: 'herb', text: '采得数株青灵草。' }]],
  ['fox', '月下白狐', '白狐衔着一枚果实，远远望着你。', '放下戒心', [{ type: 'item', itemId: 'spirit-fruit', text: '白狐留下紫纹灵果。' }], '跟随踪迹', [{ type: 'stones', value: 28, text: '你找到一处荒废灵石窝。' }]],
  ['sword-mark', '崖上剑痕', '绝壁上留着一道横贯百丈的剑痕。', '凝神观摩', [{ type: 'cultivation', value: 320, text: '一缕剑意融入识海。' }], '拓印剑痕', [{ type: 'item', itemId: 'sword', text: '石屑中埋着一柄青锋剑。' }]],
  ['caravan', '受困商队', '山道塌方，一支商队进退不得。', '出手相助', [{ type: 'stones', value: 35, text: '商队以灵石致谢。' }, { type: 'stat', stat: 'charm', value: 1, text: '善名渐渐传开。' }], '指点绕路', [{ type: 'stones', value: 12, text: '领队送上薄礼。' }]],
  ['spring', '无名灵泉', '石隙间泉水清冽，带有淡淡药香。', '饮下泉水', [{ type: 'lifespan', value: 18, text: '生机滋养肉身，寿元略增。' }], '打坐炼化', [{ type: 'cultivation', value: 210, text: '灵泉化为精纯灵力。' }]],
  ['ruin', '古战场遗迹', '残兵断戟遍地，阴风中仿佛还有喊杀声。', '超度亡魂', [{ type: 'stat', stat: 'soul', value: 3, text: '神魂经受磨砺。' }], '搜寻遗物', [{ type: 'item', itemId: 'iron', text: '取得赤纹铁。' }]],
  ['hermit', '隐士讲道', '山巅忽有讲道声，循声只见一间草庐。', '席地听讲', [{ type: 'cultivation', value: 360, text: '你听懂了三分真意。' }], '叩问长生', [{ type: 'stat', stat: 'comprehension', value: 2, text: '心中迷障稍解。' }]],
  ['meteor', '星落荒原', '夜空有青星坠落，百里皆闻雷鸣。', '追寻星痕', [{ type: 'item', itemId: 'jade', text: '你在陨坑中找到太阴玉髓。' }], '借势修行', [{ type: 'cultivation', value: 450, text: '星辉引动周天灵气。' }]],
  ['lotus', '寒潭金莲', '寒潭中央盛开一株淡金灵莲。', '涉水采莲', [{ type: 'item', itemId: 'spirit-dew', text: '莲心可炼凝露散。' }], '岸边守候', [{ type: 'cultivation', value: 160, text: '花开时道韵流转。' }]],
  ['temple', '破败山神庙', '庙中无神像，供桌上却有新鲜香灰。', '重燃香火', [{ type: 'stat', stat: 'luck', value: 2, text: '冥冥中似有回应。' }], '查探后殿', [{ type: 'stones', value: 22, text: '墙缝中藏有灵石。' }]],
  ['mist', '迷雾山谷', '雾气遮蔽神识，远处不断传来钟声。', '循钟而行', [{ type: 'item', itemId: 'bell', text: '钟声尽头留着镇魂铃。' }], '静候雾散', [{ type: 'cultivation', value: 130, text: '静坐使心境圆融。' }]],
  ['tiger', '受伤灵虎', '幼虎伏在溪畔，前爪被捕兽夹所伤。', '为它疗伤', [{ type: 'stat', stat: 'luck', value: 3, text: '灵虎长啸一声，记下你的气息。' }], '留下丹药', [{ type: 'item', itemId: 'egg', text: '虎穴旁有一枚沉眠灵兽卵。' }]],
  ['tree', '雷击古木', '焦黑古木竟在雷雨后抽出嫩芽。', '收取木心', [{ type: 'item', itemId: 'wood', text: '取得百年灵木。' }], '感悟生灭', [{ type: 'lifespan', value: 12, text: '你体悟到一丝枯荣之意。' }]],
  ['monk', '负剑修士', '陌生修士拦路求问，只问何为大道。', '答曰本心', [{ type: 'stat', stat: 'soul', value: 2, text: '二人论道至天明。' }], '答曰长生', [{ type: 'cultivation', value: 200, text: '对方赠你一页心法。' }]],
  ['bandits', '邪修拦路', '三名邪修自林中现身，索要买命钱。', '正面迎敌', [{ type: 'stones', value: 48, text: '你击退邪修，收缴了赃物。' }], '诱敌入阵', [{ type: 'cultivation', value: 260, text: '临敌应变令道行精进。' }]],
  ['library', '残卷满屋', '废宅书架未倒，残卷却多已腐朽。', '整理经卷', [{ type: 'stat', stat: 'comprehension', value: 3, text: '残篇互证，颇有所得。' }], '寻找夹层', [{ type: 'item', itemId: 'sword-manual', text: '发现太虚剑解残本。' }]],
  ['dream', '一梦百年', '树下午睡时，你梦见自己走完了另一段人生。', '记下梦境', [{ type: 'cultivation', value: 380, text: '梦中修行感悟尚在。' }], '放下执念', [{ type: 'lifespan', value: 10, text: '醒来时心神通透。' }]],
  ['peach', '山野寿桃', '老树结出一枚红得异常的桃子。', '分而食之', [{ type: 'lifespan', value: 24, text: '寿桃为你添了两年寿元。' }], '埋下桃核', [{ type: 'stat', stat: 'luck', value: 2, text: '你为后来者留下一份福缘。' }]],
  ['flood', '山洪将至', '乌云压山，山下村落仍未察觉。', '下山示警', [{ type: 'stat', stat: 'charm', value: 4, text: '数百村民因你得救。' }], '开渠引流', [{ type: 'cultivation', value: 280, text: '运转灵力开山分水。' }]],
  ['auction', '密阁拍卖', '一封无名请帖将你引到地下密阁。', '竞拍丹药', [{ type: 'item', itemId: 'foundation-pill', text: '你意外低价拍得筑基丹。' }], '鉴赏宝物', [{ type: 'stat', stat: 'comprehension', value: 2, text: '见识增长不少。' }]],
  ['dragon', '蛟影过江', '暴雨中有庞大黑影逆江而上。', '隔岸观望', [{ type: 'cultivation', value: 420, text: '蛟龙气机令你心有所感。' }], '沿江搜寻', [{ type: 'item', itemId: 'core', text: '拾得一枚残存妖丹。' }]],
  ['snow', '六月飞雪', '盛夏忽降大雪，雪花落地不化。', '收集寒气', [{ type: 'item', itemId: 'jade', text: '寒气凝成一小块玉髓。' }], '推演天象', [{ type: 'stat', stat: 'soul', value: 3, text: '神识随天象铺展开来。' }]],
  ['tea', '悟道茶会', '故友寄来茶帖，邀你至竹林一聚。', '品茶论道', [{ type: 'cultivation', value: 300, text: '一盏清茶胜过数月苦修。' }], '交换见闻', [{ type: 'stones', value: 30, text: '一则消息换来灵石酬谢。' }]],
  ['egg-hatch', '灵兽低鸣', '背包中的灵兽卵轻轻震动，似乎感应到了什么。', '注入灵力', [{ type: 'stat', stat: 'luck', value: 4, text: '蛋壳浮现神秘灵纹。' }], '耐心温养', [{ type: 'cultivation', value: 240, text: '灵兽反哺一缕精气。' }]],
  ['jade-call', '玉佩微光', '残破玉佩在月下亮起，映出陌生山河。', '神识探入', [{ type: 'item', itemId: 'jade-pendant', text: '玉佩认主，却仍无法完全解封。' }], '记录山势', [{ type: 'stat', stat: 'comprehension', value: 4, text: '山河走势暗合阵道。' }]],
  ['thunder', '旱雷惊谷', '无云之夜忽有雷声自地底传来。', '追查源头', [{ type: 'item', itemId: 'ash', text: '裂隙中留有一撮涅槃灰。' }], '盘坐守心', [{ type: 'cultivation', value: 500, text: '雷鸣震荡周身窍穴。' }]],
  ['wander', '故地重游', '你经过一座似曾相识的小镇，旧事如潮。', '寻访旧迹', [{ type: 'stat', stat: 'soul', value: 2, text: '岁月令神魂更加沉静。' }], '买酒听书', [{ type: 'stones', value: 16, text: '说书人讲的竟是前朝秘闻。' }]],
]

const BASE_EVENTS: GameEvent[] = seeds.map(([id, title, description, a, aEffects, b, bEffects], index) => ({
  id, title, description, weight: index > 26 ? 3 : 8 + (index % 4), minRealmIndex: index > 26 ? 8 : undefined,
  options: [
    { id: 'a', label: a, outcomes: [
      { id: 'success', weight: 78, effects: aEffects, resultText: aEffects.map((effect) => effect.text).join(' '), tags: id === 'bandits' || id === 'cave' || aEffects.some((effect) => effect.type === 'item') ? ['rare'] : ['insight'] },
      { id: 'setback', weight: 22, effects: id === 'bandits' ? [{ type: 'stat', stat: 'constitution', value: -2, text: '恶战留下伤势，体魄受损。' }] : [], resultText: id === 'bandits' ? '你虽脱身，却在恶战中负伤。' : '机缘稍纵即逝，此番未能有所收获。', tags: id === 'bandits' || id === 'cave' ? ['danger'] : undefined },
    ] },
    { id: 'b', label: b, outcomes: [
      { id: 'success', weight: 84, effects: bEffects, resultText: bEffects.map((effect) => effect.text).join(' '), tags: bEffects.some((effect) => effect.type === 'item') ? ['rare'] : ['insight'] },
      { id: 'ordinary', weight: 16, effects: [], resultText: '你谨慎行事，最终平安离开。' },
    ] },
    { id: 'leave', label: '谨慎离开', outcomes: [{ id: 'leave', weight: 1, effects: [{ type: 'cultivation', value: 30, text: '你守住本心，继续前行。' }], resultText: '你守住本心，继续前行。' }] },
  ],
}))

export const GAME_EVENTS: GameEvent[] = [...BASE_EVENTS, ...PATH_EVENTS]

export const eventById = (id: string) => GAME_EVENTS.find((event) => event.id === id)
