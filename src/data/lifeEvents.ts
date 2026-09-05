import { LifeStage, type EventChoice, type EventCondition, type LifeEvent, type LifeEventEffect } from '../models'
import { OPPORTUNITY_EVENTS } from './opportunityEvents'
import { SOCIAL_EVENTS } from './socialEvents'

type Seed = {
  id: string; name: string; description: string; stage: LifeStage; importance: 1 | 2 | 3 | 4; tags: string[]
  effect: LifeEventEffect; fate: string; conditions?: EventCondition[]; weight?: number; cooldown?: number
  riskLevel?: 0 | 1 | 2 | 3 | 4; rewardLevel?: 1 | 2 | 3 | 4; dangerTags?: string[]; recommendedRealmIndex?: number
}

const seeds: Seed[] = [
  { id: 'mountain-elder', name: '山中老人', description: '采药途中，你发现一位重伤老人倚在松下，气息微弱。', stage: LifeStage.MORTAL, importance: 3, tags: ['kindness', 'elder'], effect: { type: 'ADD_STAT', stat: 'charm', value: 2, text: '救人善名' }, fate: 'SAVED_ELDER' },
  { id: 'village-disaster', name: '村庄灾难', description: '山洪冲向村庄，熟悉的屋舍正被浊流吞没。', stage: LifeStage.MORTAL, importance: 3, tags: ['danger', 'village'], effect: { type: 'ADD_STAT', stat: 'constitution', value: 2, text: '救灾炼体' }, fate: 'SAVED_VILLAGE' },
  { id: 'family-upheaval', name: '家族变故', description: '一封急信传来，家中旧怨终于爆发。', stage: LifeStage.MORTAL, importance: 3, tags: ['family'], effect: { type: 'ADD_STAT', stat: 'soul', value: 2, text: '看透聚散' }, fate: 'FAMILY_BURDEN' },
  { id: 'mysterious-jade', name: '神秘玉佩', description: '旧箱底的玉佩忽然发热，映出一条陌生山路。', stage: LifeStage.MORTAL, importance: 3, tags: ['inheritance'], effect: { type: 'ADD_FATE_TAG', value: 'JADE_GUIDANCE', text: '玉佩指引' }, fate: 'JADE_GUIDANCE' },
  { id: 'passing-cultivator', name: '路遇修士', description: '御剑之人落在道旁，只问你可愿离开凡尘。', stage: LifeStage.MORTAL, importance: 4, tags: ['cultivation', 'inheritance'], effect: { type: 'LEARN_TECHNIQUE', value: 'plain-breath', text: '道人传下吐纳法' }, fate: 'MET_CULTIVATOR' },
  { id: 'beast-attack', name: '野兽袭击', description: '夜色中腥风骤起，饥饿山兽扑出密林。', stage: LifeStage.MORTAL, importance: 2, tags: ['danger'], effect: { type: 'ADD_STAT', stat: 'constitution', value: 1, text: '死战余生' }, fate: 'BEAST_SCAR' },
  { id: 'spirit-herb', name: '灵草发现', description: '岩缝里生着一株叶脉发光的异草。', stage: LifeStage.MORTAL, importance: 2, tags: ['resource', 'element:木'], effect: { type: 'ADD_CULTIVATION', value: 90, text: '炼化灵草' }, fate: 'HERB_SCENT' },
  { id: 'dream-immortal', name: '梦中仙人', description: '梦里有人立于云海，向你演示一式无名道法。', stage: LifeStage.MORTAL, importance: 3, tags: ['insight'], effect: { type: 'ADD_STAT', stat: 'comprehension', value: 3, text: '梦中悟道' }, fate: 'IMMORTAL_DREAM' },
  { id: 'mysterious-child', name: '神秘孩童', description: '迷路孩童准确说出你的姓名，却不肯说自己从何而来。', stage: LifeStage.MORTAL, importance: 2, tags: ['mystery'], effect: { type: 'ADD_STAT', stat: 'luck', value: 2, text: '未知因缘' }, fate: 'CHILD_PROMISE' },
  { id: 'heavenly-omen', name: '天降异象', description: '五色云横贯长空，恰在你头顶停留片刻。', stage: LifeStage.MORTAL, importance: 4, tags: ['omen', 'five-elements'], effect: { type: 'ADD_STAT', stat: 'luck', value: 3, text: '异象照命' }, fate: 'HEAVENLY_WITNESS' },

  { id: 'abandoned-cave', name: '废弃洞府', description: '藤蔓后藏着一座久无人至的修士洞府。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['exploration', 'inheritance'], effect: { type: 'ADD_CULTIVATION', value: 220, text: '洞府遗悟' }, fate: 'CAVE_MAP' },
  { id: 'broken-manual', name: '残缺功法', description: '残卷只剩半部，行功路线却极为大胆。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['inheritance', 'insight'], effect: { type: 'LEARN_TECHNIQUE', value: 'deep-water', text: '补全玄水残篇' }, fate: 'BROKEN_SCRIPTURE' },
  { id: 'spirit-beast-cub', name: '灵兽幼崽', description: '受伤幼兽挡在巢前，身后传来微弱叫声。', stage: LifeStage.EARLY_CULTIVATION, importance: 2, tags: ['beast', 'kindness'], effect: { type: 'ADD_STAT', stat: 'luck', value: 2, text: '灵兽亲近' }, fate: 'BEAST_COMPANION' },
  { id: 'black-market', name: '黑市交易', description: '无灯巷中，蒙面商人摆出数件来历不明的宝物。', stage: LifeStage.EARLY_CULTIVATION, importance: 2, tags: ['market', 'demonic'], effect: { type: 'ADD_STONES', value: 45, text: '黑市获利' }, fate: 'BLACK_MARKET_DEBT' },
  { id: 'cultivator-request', name: '修士求助', description: '同境修士被阵法困住，愿以一份线索换你援手。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['kindness', 'cultivator'], effect: { type: 'ADD_FATE_TAG', value: 'CULTIVATOR_FAVOR', text: '同道之恩' }, fate: 'CULTIVATOR_FAVOR' },
  { id: 'ruin-expedition', name: '遗迹探索', description: '断壁之下灵光闪烁，古阵仍在缓慢运转。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['exploration', 'danger'], effect: { type: 'ADD_STAT', stat: 'soul', value: 2, text: '古阵磨神' }, fate: 'RUIN_MARK' },
  { id: 'rare-medicine', name: '灵药发现', description: '百年灵药即将成熟，四周已有陌生气息徘徊。', stage: LifeStage.EARLY_CULTIVATION, importance: 2, tags: ['resource', 'longevity'], effect: { type: 'ADD_CULTIVATION', value: 260, text: '服食灵药' }, fate: 'MEDICINE_SEED' },
  { id: 'peer-rivalry', name: '同境竞争', description: '一名同境修士邀你论道斗法，以三年所得为赌注。', stage: LifeStage.EARLY_CULTIVATION, importance: 2, tags: ['competition'], effect: { type: 'ADD_STAT', stat: 'comprehension', value: 2, text: '论道互证' }, fate: 'WORTHY_RIVAL' },
  { id: 'secret-realm-gate', name: '秘境入口', description: '空间裂隙短暂开启，彼端传来浓郁灵气。', stage: LifeStage.EARLY_CULTIVATION, importance: 4, tags: ['secret-realm', 'danger', 'inheritance'], effect: { type: 'ACQUIRE_ROOT', value: '风', element: '风', purity: 55, stability: 68, text: '秘境风源入体' }, fate: 'SECRET_REALM_WITNESS' },
  { id: 'school-invitation', name: '师门邀请', description: '游历长老看过你的根骨，递来一枚无字令牌。', stage: LifeStage.EARLY_CULTIVATION, importance: 4, tags: ['inheritance', 'sect'], effect: { type: 'ADD_FATE_TAG', value: 'MASTER_INVITATION', text: '师门之约' }, fate: 'MASTER_INVITATION' },
  { id: 'elder-return', name: '故人再临', description: '当年获救的老人再度出现，此刻已毫无伤态。', stage: LifeStage.EARLY_CULTIVATION, importance: 4, tags: ['elder', 'inheritance', 'fate:SAVED_ELDER'], conditions: [{ type: 'FATE_TAG', value: 'SAVED_ELDER' }], effect: { type: 'LEARN_TECHNIQUE', value: 'water-wood-life', text: '老人留下长生诀' }, fate: 'ELDER_INHERITANCE' },
  { id: 'sword-at-cliff', name: '断崖问剑', description: '断崖剑痕在月下鸣响，仿佛等待后来之人。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['sword', 'path:sword'], effect: { type: 'ADD_PATH_RESOURCE', value: 18, pathResource: 'swordIntent', text: '剑痕生意' }, fate: 'CLIFF_SWORD' },
  { id: 'five-spring', name: '五色灵泉', description: '五眼灵泉相环而生，气机却并不均衡。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['five-elements', 'element:水'], effect: { type: 'ADD_CULTIVATION', value: 300, text: '五泉洗脉' }, fate: 'FIVE_SPRING' },
  { id: 'body-forge', name: '古炉淬身', description: '废弃古炉仍有地火，足以熬炼一身筋骨。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['body', 'path:body', 'danger'], effect: { type: 'ADD_STAT', stat: 'constitution', value: 3, text: '地火淬体' }, fate: 'FORGED_BODY' },
  { id: 'shadow-whisper', name: '影中低语', description: '无人的影子向你许诺一条更快的修行路。', stage: LifeStage.EARLY_CULTIVATION, importance: 3, tags: ['demonic', 'path:demonic'], effect: { type: 'ADD_PATH_RESOURCE', value: 12, pathResource: 'demonicNature', text: '魔念入心' }, fate: 'SHADOW_PACT' },

  { id: 'great-inheritance', name: '大能传承', description: '一缕横跨万年的神念，在你识海中缓缓苏醒。', stage: LifeStage.MID_CULTIVATION, importance: 4, tags: ['inheritance', 'legendary'], effect: { type: 'LEARN_TECHNIQUE', value: 'star-soul', text: '承接星河传承' }, fate: 'GREAT_INHERITANCE' },
  { id: 'inner-demon-realm', name: '心魔幻境', description: '最深的执念化作真实世界，将你困在其中。', stage: LifeStage.MID_CULTIVATION, importance: 3, tags: ['demonic', 'danger', 'insight'], effect: { type: 'ADD_STAT', stat: 'soul', value: 3, text: '破除心障' }, fate: 'DEFEATED_INNER_DEMON' },
  { id: 'tribulation-omen', name: '天劫异象', description: '尚未落下的劫云提前显化，雷光映照你的道基。', stage: LifeStage.MID_CULTIVATION, importance: 4, tags: ['tribulation', 'element:雷'], effect: { type: 'ACQUIRE_ROOT', value: '雷', element: '雷', purity: 68, stability: 48, text: '劫雷留根' }, fate: 'TRIBULATION_MARK' },
  { id: 'ancient-ruins', name: '上古遗迹', description: '大地开裂，一座不属于此纪元的城池浮出。', stage: LifeStage.MID_CULTIVATION, importance: 4, tags: ['exploration', 'legendary'], effect: { type: 'ADD_CULTIVATION', value: 900, text: '上古道痕' }, fate: 'ANCIENT_CITY' },
  { id: 'dao-insight', name: '大道感悟', description: '天地万物忽然安静，你看见自身大道的一角。', stage: LifeStage.MID_CULTIVATION, importance: 4, tags: ['insight'], effect: { type: 'ADD_STAT', stat: 'comprehension', value: 4, text: '大道顿悟' }, fate: 'DAO_GLIMPSE' },
  { id: 'treasure-contest', name: '天材地宝争夺', description: '异宝出世，各方强者的气息同时降临。', stage: LifeStage.MID_CULTIVATION, importance: 3, tags: ['competition', 'danger', 'resource'], effect: { type: 'ADD_CULTIVATION', value: 700, text: '夺得异宝' }, fate: 'TREASURE_RIVALRY' },
  { id: 'senior-guidance', name: '高阶修士指点', description: '云上来客看了你一眼，点破多年修行疑难。', stage: LifeStage.MID_CULTIVATION, importance: 3, tags: ['cultivator', 'insight'], effect: { type: 'ADD_STAT', stat: 'comprehension', value: 3, text: '高人点拨' }, fate: 'SENIOR_WORD' },
  { id: 'lifespan-crisis', name: '寿元危机', description: '天人五衰初显，你第一次清晰听见寿元流逝。', stage: LifeStage.OLD_AGE, importance: 4, tags: ['longevity', 'danger'], effect: { type: 'ADD_FATE_TAG', value: 'FACED_MORTAL_LIMIT', text: '直面大限' }, fate: 'FACED_MORTAL_LIMIT' },
  { id: 'dao-heart-test', name: '道心考验', description: '所得与所求互相冲突，你必须决定何者才是本心。', stage: LifeStage.MID_CULTIVATION, importance: 3, tags: ['insight'], effect: { type: 'ADD_STAT', stat: 'soul', value: 3, text: '道心澄明' }, fate: 'DAO_HEART_CHOICE' },
  { id: 'karma-reckoning', name: '因果清算', description: '旧日选择化作人影，一一站到你的洞府门前。', stage: LifeStage.MID_CULTIVATION, importance: 4, tags: ['karma', 'danger'], conditions: [{ type: 'HISTORY_TAG', value: 'danger' }], effect: { type: 'ADD_FATE_TAG', value: 'KARMA_SETTLED', text: '因果暂清' }, fate: 'KARMA_SETTLED' },
  { id: 'sword-sea', name: '万剑归海', description: '万柄残剑自地底升起，向真正的剑心低首。', stage: LifeStage.LATE_CULTIVATION, importance: 4, tags: ['sword', 'path:sword', 'legendary'], conditions: [{ type: 'PATH', value: 'sword' }], effect: { type: 'ADD_PATH_RESOURCE', value: 40, pathResource: 'swordIntent', text: '万剑朝宗' }, fate: 'TEN_THOUSAND_SWORDS' },
  { id: 'five-elements-cycle', name: '五行天轮', description: '五方天光汇成巨轮，照见相生相克的终极变化。', stage: LifeStage.LATE_CULTIVATION, importance: 4, tags: ['five-elements', 'legendary'], effect: { type: 'TRIGGER_TALENT', value: 'five-unity', text: '五行归一之机' }, fate: 'FIVE_ELEMENT_WHEEL' },
  { id: 'demonic-throne', name: '魔主之座', description: '无主王座以万千魔念呼唤新的主人。', stage: LifeStage.LATE_CULTIVATION, importance: 4, tags: ['demonic', 'path:demonic', 'legendary'], conditions: [{ type: 'PATH', value: 'demonic' }], effect: { type: 'ADD_PATH_RESOURCE', value: 20, pathResource: 'demonicNature', text: '登临魔座' }, fate: 'DEMONIC_THRONE' },
  { id: 'ghost-river', name: '幽冥渡口', description: '忘川支流短暂贯通人间，无数旧魂呼唤你的名字。', stage: LifeStage.LATE_CULTIVATION, importance: 4, tags: ['ghost', 'path:ghost'], conditions: [{ type: 'PATH', value: 'ghost' }], effect: { type: 'ADD_STAT', stat: 'soul', value: 4, text: '渡口观魂' }, fate: 'GHOST_FERRY' },
  { id: 'world-responsibility', name: '苍生一念', description: '大陆危局汇至眼前，你已有能力影响无数人的命运。', stage: LifeStage.LATE_CULTIVATION, importance: 4, tags: ['world', 'karma'], effect: { type: 'ADD_FATE_TAG', value: 'WORLD_GUARDIAN', text: '苍生之责' }, fate: 'WORLD_GUARDIAN' },
]

function choices(seed: Seed, index: number): EventChoice[] {
  if (seed.id === 'mountain-elder') return [
    { id: 'save', label: '救助老人', description: '耗费时间为其疗伤。', result: '你救下老人。他临别前认真记住了你的名字。', effects: [seed.effect, { type: 'ADD_FATE_TAG', value: 'SAVED_ELDER', text: '救命之恩' }] },
    { id: 'search', label: '搜查物品', description: '趁其无力反抗取走财物。', result: '你得到财物，也背上了一段未了恶因。', effects: [{ type: 'ADD_STONES', value: 30, text: '取走老人灵石' }, { type: 'ADD_FATE_TAG', value: 'ROBBED_ELDER', text: '夺物之恶' }] },
    { id: 'leave', label: '转身离开', description: '不介入陌生人的命数。', result: '山风掩去身后的咳声，这段因果暂且与你无关。', effects: [{ type: 'ADD_FATE_TAG', value: 'IGNORED_ELDER', text: '见死未救' }] },
  ]
  return [
    { id: 'engage', label: '主动介入', description: '承担风险，也接受随之而来的因果。', result: `你选择直面「${seed.name}」，此事从此成为一段人生痕迹。`, effects: [seed.effect, ...(seed.effect.type === 'ADD_FATE_TAG' && seed.effect.value === seed.fate ? [] : [{ type: 'ADD_FATE_TAG' as const, value: seed.fate, text: `${seed.name}之因` }])], riskModifier: 1, rewardModifier: 0 },
    { id: 'seek', label: '为己谋取', description: '先衡量此事能为修行带来什么。', result: '你取走眼前所得，但另一种可能也随之消散。', effects: [index % 2 ? { type: 'ADD_CULTIVATION', value: 60 + index * 5, text: '借机修行' } : { type: 'ADD_STONES', value: 12 + index, text: '取走资源' }, { type: 'ADD_FATE_TAG', value: `SELF_${seed.id.toUpperCase()}`, text: '利己之择' }], riskModifier: .7, rewardModifier: 0 },
    { id: 'leave', label: '谨慎离开', description: '保全自身，不让陌生因果缠身。', result: '你记住了所见，却没有再向前一步。', effects: [{ type: 'ADD_FATE_TAG', value: `PASSED_${seed.id.toUpperCase()}`, text: '擦肩而过' }], riskModifier: 0, rewardModifier: -1 },
  ]
}

export const BASE_LIFE_EVENTS: LifeEvent[] = seeds.map((seed, index) => ({
  id: seed.id, name: seed.name, description: seed.description, stage: seed.stage, conditions: seed.conditions ?? [],
  choices: choices(seed, index), weight: seed.weight ?? 8 + index % 5, cooldown: seed.cooldown ?? 12, tags: seed.tags, importance: seed.importance,
  riskLevel: seed.riskLevel ?? (seed.tags.includes('danger') ? (seed.importance >= 4 ? 3 : 2) : 0), rewardLevel: seed.rewardLevel ?? (seed.importance >= 4 ? 3 : seed.importance >= 3 ? 2 : 1), dangerTags: seed.dangerTags ?? seed.tags.filter((tag) => ['danger', 'tribulation', 'demonic'].includes(tag)), recommendedRealmIndex: seed.recommendedRealmIndex,
}))

export const LIFE_EVENTS: LifeEvent[] = [...BASE_LIFE_EVENTS, ...OPPORTUNITY_EVENTS, ...SOCIAL_EVENTS]
