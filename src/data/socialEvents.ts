import { LifeStage, type LifeEvent } from '../models'

export const SOCIAL_EVENTS: LifeEvent[] = [
  { id: 'sect-war', name: '宗门大战', description: '敌对宗门越境夺脉，护山大阵已经升起。每个门人都必须决定自己站在哪里。', stage: LifeStage.MID_CULTIVATION, conditions: [{ type: 'HAS_SECT', value: 1 }, { type: 'HOSTILE_SECT', value: 1 }], weight: 8, cooldown: 45, tags: ['sect', 'war', 'combat', 'danger'], importance: 4, riskLevel: 4, rewardLevel: 4, dangerTags: ['combat', 'sect-war'], recommendedRealmIndex: 15, choices: [
    { id: 'front', label: '镇守前线', description: '以性命护持山门，战功和风险同样惊人。', result: '你随同门踏出大阵，在灵脉上空迎战强敌。', riskModifier: 1, effects: [{ type: 'ADD_CONTRIBUTION', value: 320, text: '宗门战功' }, { type: 'ADD_FATE_TAG', value: 'DEFENDED_SECT', text: '护宗之战' }] },
    { id: 'supply', label: '护送补给', description: '承担侧翼风险，为前线维持灵力。', result: '你护送丹药和阵盘穿过战线。', riskModifier: .45, rewardModifier: -1, effects: [{ type: 'ADD_CONTRIBUTION', value: 120, text: '后勤战功' }] },
    { id: 'leave', label: '避战闭关', result: '你封住洞府，不让战火卷入自身。', riskModifier: 0, rewardModifier: -2, effects: [{ type: 'ADD_FATE_TAG', value: 'AVOIDED_SECT_WAR', text: '避战之名' }] },
  ] },
  { id: 'family-crisis-social', name: '家族危机', description: '族地灵脉衰竭，年轻族人请求你出手维持家族根基。', stage: LifeStage.EARLY_CULTIVATION, conditions: [{ type: 'FAMILY_KIND', value: '玩家家族' }], weight: 10, cooldown: 24, tags: ['family', 'resource'], importance: 3, riskLevel: 1, rewardLevel: 2, dangerTags: ['resource-loss'], choices: [
    { id: 'support', label: '拿出私藏救急', result: '你将灵石与灵药交给族中，暂时稳住灵脉。', riskModifier: .2, effects: [{ type: 'ADD_STONES', value: -80 }, { type: 'ADD_FAMILY_RESOURCE', value: 120 }, { type: 'ADD_FATE_TAG', value: 'SUPPORTED_FAMILY', text: '护族之恩' }] },
    { id: 'lead', label: '带族人另寻灵地', result: '你带领族人踏上寻找新族地的路。', riskModifier: .8, effects: [{ type: 'ADD_FAMILY_RESOURCE', value: 180 }, { type: 'ADD_RELATIONSHIP', relationshipType: '恩情', value: 20 }] },
    { id: 'leave', label: '任其自救', result: '你没有介入家族的资源困局。', riskModifier: 0, rewardModifier: -1, effects: [{ type: 'ADD_FATE_TAG', value: 'IGNORED_FAMILY', text: '弃族之议' }] },
  ] },
  { id: 'master-missing', name: '师父失踪', description: '师父外出追查一处遗迹后杳无音讯，只留下半枚破碎命牌。', stage: LifeStage.MID_CULTIVATION, conditions: [{ type: 'HAS_MASTER', value: 1 }], weight: 12, cooldown: 60, tags: ['master', 'relationship', 'inheritance'], importance: 4, riskLevel: 3, rewardLevel: 3, dangerTags: ['adventure', 'restriction'], choices: [
    { id: 'search', label: '循命牌追寻', result: '你沿命牌最后的灵机踏入荒野。', riskModifier: 1, effects: [{ type: 'ADD_FATE_TAG', value: 'SEARCHING_MASTER', text: '寻师之路' }, { type: 'ADD_RELATIONSHIP', relationshipType: '恩情', value: 25 }] },
    { id: 'wait', label: '守住洞府等待', result: '你替师父守住洞府与传承，静候消息。', riskModifier: .2, rewardModifier: -1, effects: [{ type: 'ADD_CONTRIBUTION', value: 60 }] },
    { id: 'leave', label: '接管遗物', result: '你默认师父已死，开始清点他留下的东西。', riskModifier: 0, effects: [{ type: 'ADD_FATE_TAG', value: 'CLAIMED_MASTER_LEGACY', text: '承师遗物' }] },
  ] },
  { id: 'peer-challenge', name: '同门论道', description: '同期弟子在论道台上点名邀战，围观者已将你们视为这一代的竞争者。', stage: LifeStage.EARLY_CULTIVATION, conditions: [{ type: 'HAS_SECT', value: 1 }], weight: 14, cooldown: 8, tags: ['sect', 'peer', 'competition'], importance: 2, riskLevel: 1, rewardLevel: 2, dangerTags: ['sparring'], choices: [
    { id: 'accept', label: '登台应战', result: '你与同门各展所学，胜负之外也看见自身短处。', riskModifier: .5, effects: [{ type: 'ADD_CONTRIBUTION', value: 25 }, { type: 'ADD_RELATIONSHIP', relationshipType: '竞争', value: 45 }] },
    { id: 'discuss', label: '改为坐而论道', result: '你们收起兵刃，以经义互证。', riskModifier: 0, effects: [{ type: 'ADD_STAT', stat: 'comprehension', value: 1 }, { type: 'ADD_RELATIONSHIP', relationshipType: '好友', value: 15 }] },
    { id: 'leave', label: '拒绝邀战', result: '你没有把时间花在同门排名上。', riskModifier: 0, rewardModifier: -1, effects: [] },
  ] },
  { id: 'friend-breakthrough-aid', name: '道友相助', description: '一位旧日道友在你瓶颈前来访，愿替你护法并分享破境心得。', stage: LifeStage.MID_CULTIVATION, conditions: [{ type: 'RELATIONSHIP_TYPE', value: '好友' }], weight: 12, cooldown: 25, tags: ['relationship', 'friend', 'breakthrough'], importance: 3, riskLevel: 0, rewardLevel: 3, dangerTags: [], choices: [
    { id: 'accept', label: '请道友护法', result: '故人坐在阵外，你得以安心推演破境关隘。', riskModifier: 0, effects: [{ type: 'ADD_FATE_TAG', value: 'FRIEND_GUARDED_BREAKTHROUGH', text: '道友护法' }, { type: 'ADD_RELATIONSHIP', relationshipType: '恩情', value: 20 }] },
    { id: 'exchange', label: '交换心得', result: '你们互证所学，各有所得。', riskModifier: 0, rewardModifier: -1, effects: [{ type: 'ADD_STAT', stat: 'comprehension', value: 2 }] },
    { id: 'decline', label: '独自面对', result: '你谢过好意，仍决定独自破境。', riskModifier: 0, rewardModifier: -2, effects: [] },
  ] },
  { id: 'territory-dispute', name: '灵脉争夺', description: '宗门控制的资源地逐渐枯竭，邻近势力开始试探边界。', stage: LifeStage.MID_CULTIVATION, conditions: [{ type: 'HAS_SECT', value: 1 }], weight: 9, cooldown: 30, tags: ['sect', 'territory', 'resource', 'world'], importance: 3, riskLevel: 2, rewardLevel: 3, dangerTags: ['combat', 'resource-war'], choices: [
    { id: 'contest', label: '带队争夺灵脉', result: '你带领同门进入争议区域，以实力重划边界。', riskModifier: 1, effects: [{ type: 'ADD_CONTRIBUTION', value: 150 }, { type: 'ADD_RESOURCE', resource: 'spiritHerbs', value: 4 }] },
    { id: 'negotiate', label: '主持谈判', result: '你试图用声望与人情避免大战。', riskModifier: .25, rewardModifier: -1, effects: [{ type: 'ADD_RELATIONSHIP', relationshipType: '恩情', value: 15 }, { type: 'ADD_CONTRIBUTION', value: 70 }] },
    { id: 'leave', label: '不问此事', result: '资源版图的变化没有留下你的名字。', riskModifier: 0, rewardModifier: -2, effects: [] },
  ] },
  { id: 'social-enemy-ambush', name: '故敌截道', description: '旧日结仇的修士算准你的行程，在山谷中设下阵旗。', stage: LifeStage.MID_CULTIVATION, conditions: [{ type: 'RELATIONSHIP_TYPE', value: '敌对' }], weight: 13, cooldown: 16, tags: ['relationship', 'enemy', 'combat', 'danger'], importance: 3, riskLevel: 3, rewardLevel: 3, dangerTags: ['combat', 'revenge'], choices: [
    { id: 'fight', label: '正面破阵', result: '你不再回避这段恩怨，以生死了结旧仇。', riskModifier: 1, effects: [{ type: 'ADD_FATE_TAG', value: 'FACED_SOCIAL_ENEMY', text: '故敌之战' }] },
    { id: 'escape', label: '寻隙遁走', result: '你以地势遮掩气机，从阵角强行突围。', riskModifier: .55, rewardModifier: -1, effects: [] },
    { id: 'leave', label: '提前改道', result: '气运让你提前察觉杀机，没有踏入山谷。', riskModifier: 0, rewardModifier: -2, effects: [] },
  ] },
]
