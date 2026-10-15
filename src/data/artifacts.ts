import { ItemCategory, type ArtifactDefinition, type ItemDefinition } from '../models'

const artifact = (definition: ArtifactDefinition, slot: ItemDefinition['equipmentSlot'], combatPower: number): ItemDefinition => ({
  id: definition.id,
  name: definition.name,
  type: slot === 'weapon' ? '武器' : slot === 'armor' ? '防具' : slot === 'accessory' ? '饰品' : '法器',
  category: slot === 'weapon' ? ItemCategory.WEAPON : slot === 'armor' ? ItemCategory.ARMOR : slot === 'accessory' ? ItemCategory.ACCESSORY : ItemCategory.ARTIFACT,
  quality: definition.grade,
  description: definition.description,
  equipmentSlot: slot,
  combatPower,
  itemEffects: definition.passiveEffects,
  preferredPaths: definition.preferredPaths,
  preferredElements: definition.preferredElements,
  artifact: definition,
  weaponVisualTag: definition.weaponVisualTag,
  artifactVisualTag: definition.artifactVisualTag,
})

export const ARTIFACT_DEFINITIONS: ArtifactDefinition[] = [
  { id: 'frost-edge-sword', name: '青霜飞剑', grade: '极品', description: '寒金铸成，出鞘时剑光如雪。', preferredPaths: ['sword'], preferredElements: ['金', '冰'], weaponVisualTag: '青霜出鞘，剑光如雪。', passiveEffects: [{ type: 'ATTACK', value: 92, description: '攻击 +92' }, { type: 'SWORD_INTENT', value: .08, description: '剑意战斗效果 +8%', condition: { paths: ['sword'] } }], activeEffect: { type: 'POWER_BURST', value: .18, description: '青霜剑气令本场攻势提高 18%' } },
  { id: 'five-element-orb', name: '五行灵珠', grade: '极品', description: '五色灵光循环不息，贵在调和而非锋锐。', preferredPaths: ['dao'], preferredElements: ['金', '木', '水', '火', '土'], artifactVisualTag: '五色灵光轮转，生克之势汇于一处。', passiveEffects: [{ type: 'TECHNIQUE_AFFINITY', value: .08, description: '五行功法契合 +8%' }, { type: 'BREAKTHROUGH_STABILITY', value: .05, description: '五行平衡时突破稳定 +5%' }] },
  { id: 'soul-calming-bell', name: '镇魂铃', grade: '稀有', description: '铃声不响于耳，只镇神魂。', preferredPaths: ['ghost'], preferredElements: ['暗'], artifactVisualTag: '铃音幽幽，对手神魂为之一滞。', passiveEffects: [{ type: 'SOUL_STABILITY', value: 12, description: '魂体稳定 +12' }, { type: 'SOUL', value: 8, description: '神识战斗贡献 +8' }], activeEffect: { type: 'SOUL_DISRUPTION', value: .14, description: '干扰敌方神识，攻势提高 14%' } },
  { id: 'blood-fiend-pearl', name: '血煞珠', grade: '极品', description: '血光内敛，催动时以魔性换来爆发。', preferredPaths: ['demonic'], preferredElements: ['火', '暗'], artifactVisualTag: '血煞珠骤然明亮，猩红魔焰席卷战场。', passiveEffects: [{ type: 'ATTACK', value: 74, description: '攻击 +74' }, { type: 'STRATEGY_OFFENSE', value: .12, description: '激进与拼命策略攻势 +12%', condition: { paths: ['demonic'] } }], activeEffect: { type: 'POWER_BURST', value: .22, description: '血煞爆发令本场攻势提高 22%' } },
  { id: 'black-tortoise-armor', name: '玄武甲', grade: '极品', description: '妖兽骨甲层叠如玄武背壳。', preferredPaths: ['body'], preferredElements: ['土', '水'], passiveEffects: [{ type: 'DEFENSE', value: 105, description: '防御 +105' }, { type: 'COMBAT_HEALTH', value: 160, description: '临时战斗气血 +160' }, { type: 'INJURY_REDUCTION', value: .18, description: '重伤风险降低 18%' }] },
  { id: 'void-treasure', name: '遁空符宝', grade: '稀有', description: '可在方寸之间撕开一道短暂遁隙。', preferredPaths: ['dao', 'ghost'], passiveEffects: [{ type: 'ESCAPE_CHANCE', value: .25, description: '逃跑成功率 +25%' }], activeEffect: { type: 'ESCAPE', value: .32, description: '催动遁隙，逃跑成功率提高 32%' } },
  { id: 'heart-mirror', name: '护心镜', grade: '精品', description: '一线清光护住心脉，胜在保命。', preferredPaths: ['body', 'dao'], passiveEffects: [{ type: 'DEFENSE', value: 32, description: '防御 +32' }, { type: 'INJURY_REDUCTION', value: .22, description: '重伤与濒死风险降低 22%' }] },
  { id: 'spirit-gathering-disc', name: '聚灵盘', grade: '稀有', description: '牵引周遭灵气，闭关时尤为有用。', preferredPaths: ['dao'], passiveEffects: [{ type: 'MEDITATION_EFFICIENCY', value: .14, description: '闭关效率 +14%' }, { type: 'COMBAT_POWER', value: 18, description: '战斗贡献 +18' }] },
  { id: 'thunder-fire-seal', name: '雷火印', grade: '极品', description: '雷火相激，攻伐猛烈，却并非人人可驭。', preferredPaths: ['sword', 'dao'], preferredElements: ['雷', '火'], artifactVisualTag: '雷火印轰然落下，霆火交织。', passiveEffects: [{ type: 'ELEMENT_POWER', value: .16, description: '雷火攻势 +16%', condition: { elements: ['雷', '火'] } }, { type: 'ATTACK', value: 68, description: '攻击 +68' }], activeEffect: { type: 'POWER_BURST', value: .17, description: '雷火齐发，本场攻势提高 17%' } },
  { id: 'soul-nourishing-lamp', name: '养魂灯', grade: '稀有', description: '青焰不灼肉身，专养魂魄。', preferredPaths: ['ghost'], preferredElements: ['暗'], passiveEffects: [{ type: 'SOUL_STABILITY', value: 18, description: '魂体稳定 +18' }, { type: 'SOUL', value: 12, description: '神识战斗贡献 +12' }] },
  { id: 'longevity-jade', name: '长生玉佩', grade: '奇珍', description: '玉中生机绵长，可为佩戴者稍延天年。', preferredPaths: ['dao'], preferredElements: ['木', '光'], passiveEffects: [{ type: 'LIFESPAN_YEARS', value: 8, description: '寿元上限 +8 年' }, { type: 'BREAKTHROUGH_STABILITY', value: .03, description: '突破稳定 +3%' }] },
  { id: 'restriction-awl', name: '破禁锥', grade: '稀有', description: '斗法威能平平，却能寻隙破阵。', preferredPaths: ['dao'], passiveEffects: [{ type: 'RESTRICTION_RESISTANCE', value: .28, description: '秘境禁制风险降低 28%' }, { type: 'COMBAT_POWER', value: 8, description: '战斗贡献 +8' }], activeEffect: { type: 'BREAK_RESTRICTION', value: .35, description: '破除部分秘境禁制' } },
]

export const ARTIFACT_ITEMS = ARTIFACT_DEFINITIONS.map((entry) => artifact(entry, entry.id === 'frost-edge-sword' ? 'weapon' : entry.id === 'black-tortoise-armor' ? 'armor' : ['heart-mirror', 'longevity-jade'].includes(entry.id) ? 'accessory' : 'artifact', entry.id === 'restriction-awl' ? 8 : entry.grade === '奇珍' ? 72 : entry.grade === '极品' ? 62 : entry.grade === '稀有' ? 42 : 28))

export const BASIC_EQUIPMENT_ITEMS: ItemDefinition[] = [
  { id: 'green-edge-weapon', name: '青锋剑', type: '武器', category: ItemCategory.WEAPON, quality: '良品', description: '修士常用的制式飞剑。', equipmentSlot: 'weapon', combatPower: 18, preferredPaths: ['sword', 'dao'], preferredElements: ['金'], weaponVisualTag: '青锋划过一道寒芒。', itemEffects: [{ type: 'ATTACK', value: 36, description: '攻击 +36' }] },
  { id: 'beast-bone-armor', name: '妖骨甲', type: '防具', category: ItemCategory.ARMOR, quality: '精品', description: '以妖骨和兽皮层叠炼成。', equipmentSlot: 'armor', combatPower: 24, preferredPaths: ['body'], itemEffects: [{ type: 'DEFENSE', value: 52, description: '防御 +52' }, { type: 'COMBAT_HEALTH', value: 60, description: '临时战斗气血 +60' }] },
  { id: 'sword-heart-charm', name: '剑心坠', type: '饰品', category: ItemCategory.ACCESSORY, quality: '稀有', description: '佩戴时心神澄明，剑意更易凝聚。', equipmentSlot: 'accessory', combatPower: 28, preferredPaths: ['sword'], itemEffects: [{ type: 'SWORD_INTENT', value: .06, description: '剑意战斗效果 +6%' }, { type: 'BREAKTHROUGH_STABILITY', value: .02, description: '突破稳定 +2%' }] },
]

export const artifactById = (id: string) => ARTIFACT_DEFINITIONS.find((entry) => entry.id === id)
