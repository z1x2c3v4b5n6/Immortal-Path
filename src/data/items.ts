import type { ItemDefinition } from '../models'

export const ITEMS: ItemDefinition[] = [
  { id: 'qi-pill', name: '聚气丹', type: '丹药', quality: '凡品', description: '温养经脉的入门丹药。', effects: [{ type: 'cultivation', value: 90 }] },
  { id: 'spirit-dew', name: '凝露散', type: '丹药', quality: '良品', description: '灵露炼成，服后神清。', effects: [{ type: 'cultivation', value: 260 }] },
  { id: 'foundation-pill', name: '筑基丹', type: '丹药', quality: '稀有', requiredRealmIndex: 8, description: '辅助修士筑基的珍贵丹药。', effects: [{ type: 'cultivation', value: 1500 }] },
  { id: 'longevity-pill', name: '小延寿丹', type: '丹药', quality: '极品', description: '平添十二载寿元。', effects: [{ type: 'lifespan', value: 144 }] },
  { id: 'herb', name: '青灵草', type: '材料', quality: '凡品', description: '常见的低阶灵草。' },
  { id: 'iron', name: '赤纹铁', type: '材料', quality: '良品', description: '内蕴火性的炼器矿材。' },
  { id: 'wood', name: '百年灵木', type: '材料', quality: '精品', description: '经百年灵气滋养的木心。' },
  { id: 'core', name: '妖兽内丹', type: '材料', quality: '稀有', requiredRealmIndex: 11, description: '凝聚妖兽一身精华。' },
  { id: 'jade', name: '太阴玉髓', type: '材料', quality: '极品', requiredRealmIndex: 15, description: '月华凝成的玉中精髓。' },
  { id: 'sword', name: '青锋剑', type: '法器', quality: '良品', description: '修士常用的制式飞剑。' },
  { id: 'bell', name: '镇魂铃', type: '法器', quality: '精品', requiredRealmIndex: 11, description: '铃音可定神魂。' },
  { id: 'seal', name: '山河印', type: '法器', quality: '稀有', requiredRealmIndex: 15, description: '仿古宝炼制，重若山岳。' },
  { id: 'cloak', name: '流云氅', type: '法器', quality: '极品', requiredRealmIndex: 15, description: '云霞织就，轻盈无尘。' },
  { id: 'map', name: '残缺秘境图', type: '特殊', quality: '精品', description: '标记着一处失落洞府。' },
  { id: 'token', name: '青云令', type: '特殊', quality: '良品', description: '青云宗外门信物。' },
  { id: 'egg', name: '沉眠灵兽卵', type: '特殊', quality: '稀有', description: '其中传来极轻的心跳。' },
  { id: 'jade-pendant', name: '未知残破玉佩', type: '传承', quality: '奇珍', requiredRealmIndex: 15, description: '当前境界无法窥探其中秘密。' },
  { id: 'sword-manual', name: '太虚剑解', type: '传承', quality: '极品', requiredRealmIndex: 15, description: '字里行间皆有剑意。' },
  { id: 'star-scroll', name: '周天星图', type: '传承', quality: '奇珍', requiredRealmIndex: 19, description: '记录上古观星者的修行法。' },
  { id: 'ash', name: '涅槃灰', type: '材料', quality: '奇珍', requiredRealmIndex: 19, description: '余温万载不散。' },
  { id: 'spirit-fruit', name: '紫纹灵果', type: '丹药', quality: '精品', description: '入口化作清冽灵气。', effects: [{ type: 'cultivation', value: 620 }] },
  { id: 'ancient-coin', name: '上古道钱', type: '特殊', quality: '稀有', description: '早已失传的修真货币。' },
]

export const itemById = (id: string) => ITEMS.find((item) => item.id === id)
