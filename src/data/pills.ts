import { ItemCategory, type ItemDefinition, type PillDefinition } from '../models'

export const PILL_DEFINITIONS: PillDefinition[] = [
  { id: 'qi-pill', name: '聚气丹', grade: '凡品', description: '温养经脉的入门丹药。', effects: [{ type: 'CULTIVATION', value: 90, description: '修为 +90' }], toxicity: 3 },
  { id: 'foundation-pill', name: '筑基丹', grade: '稀有', description: '辅助炼气修士筑基，并非破境门票。', effects: [{ type: 'BREAKTHROUGH', value: .2, target: '筑基', description: '突破筑基成功率 +20%' }], toxicity: 12 },
  { id: 'gold-core-pill', name: '结金丹', grade: '极品', description: '凝炼金性，辅助结丹。', effects: [{ type: 'BREAKTHROUGH', value: .15, target: '金丹', description: '突破金丹成功率 +15%' }], toxicity: 14 },
  { id: 'nascent-soul-pill', name: '凝婴丹', grade: '奇珍', description: '护神凝婴，辅助元婴大关。', effects: [{ type: 'BREAKTHROUGH', value: .12, target: '元婴', description: '突破元婴成功率 +12%' }], toxicity: 16 },
  { id: 'spring-return-pill', name: '回春丹', grade: '良品', description: '调和气血，可消退轻伤。', effects: [{ type: 'HEAL', value: 1, description: '移除轻伤' }], toxicity: 4 },
  { id: 'healing-pill', name: '疗伤丹', grade: '精品', description: '续接经脉，使重伤缓解为轻伤。', effects: [{ type: 'HEAL', value: 2, description: '重伤降为轻伤' }], toxicity: 7 },
  { id: 'heart-protection-pill', name: '护心丹', grade: '稀有', description: '护住心脉，可炼作战斗底牌。', effects: [{ type: 'PROTECT_HEART', value: .24, description: '本场重伤与濒死风险降低 24%' }], toxicity: 8 },
  { id: 'longevity-pill', name: '延寿丹', grade: '极品', description: '药力随重复服用而递减。', effects: [{ type: 'LIFESPAN', value: 10, description: '基础寿元收益 10 年' }], toxicity: 18 },
  { id: 'greater-longevity-pill', name: '太元延寿丹', grade: '奇珍', description: '汇聚旺盛生机，仍受同类递减限制。', effects: [{ type: 'LIFESPAN', value: 30, description: '基础寿元收益 30 年' }], toxicity: 26 },
  { id: 'fire-root-pill', name: '火灵洗髓丹', grade: '稀有', description: '温养已有的后天火灵根，无法凭空造就天灵根。', effects: [{ type: 'ACQUIRED_ROOT', value: 5, target: '火', description: '后天火灵根纯度提高' }], toxicity: 13 },
  { id: 'five-element-pill', name: '五行洗髓丹', grade: '极品', description: '补足五行底蕴中最薄弱的一环。', effects: [{ type: 'FIVE_ELEMENT', value: 8, description: '最低五行成长 +8' }], toxicity: 15 },
  { id: 'qi-burst-pill', name: '爆气丹', grade: '精品', description: '短时催发灵力，战后容易疲惫。', effects: [{ type: 'COMBAT_POWER', value: .15, description: '当前战斗临时战力 +15%' }], toxicity: 10 },
  { id: 'cleansing-pill', name: '清毒丹', grade: '精品', description: '化解积聚丹毒。', effects: [{ type: 'DETOX', value: 24, description: '丹毒 -24' }], toxicity: 0 },
]

export const PILL_ITEMS: ItemDefinition[] = PILL_DEFINITIONS.map((pill) => ({ id: pill.id, name: pill.name, type: '丹药', category: ItemCategory.PILL, quality: pill.grade, description: pill.description, pill }))
export const pillById = (id: string) => PILL_DEFINITIONS.find((entry) => entry.id === id)
