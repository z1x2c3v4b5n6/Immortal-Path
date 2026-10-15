import { ItemCategory, type ItemDefinition } from '../models'

export const V6_MATERIALS: ItemDefinition[] = [
  { id: 'green-spirit-herb', name: '青灵草', type: '材料', category: ItemCategory.MATERIAL, quality: '凡品', materialKind: '灵药', description: '秘境灵谷常见的基础灵药。' },
  { id: 'wolf-hide', name: '妖狼皮', type: '材料', category: ItemCategory.MATERIAL, quality: '良品', materialKind: '妖兽材料', description: '韧性尚可，可炼制低阶护具。' },
  { id: 'beast-bone', name: '妖兽骨', type: '材料', category: ItemCategory.MATERIAL, quality: '良品', materialKind: '妖兽材料', description: '残留妖力的骨材。' },
  { id: 'black-iron', name: '玄铁', type: '材料', category: ItemCategory.MATERIAL, quality: '精品', materialKind: '矿石', description: '炼制飞剑与护具的常用灵矿。' },
  { id: 'yin-soul-sand', name: '阴魂砂', type: '材料', category: ItemCategory.MATERIAL, quality: '精品', materialKind: '魂材', description: '阴气沉积而成，鬼修法宝常用。' },
  { id: 'five-element-stone', name: '五行灵石', type: '材料', category: ItemCategory.MATERIAL, quality: '稀有', materialKind: '五行材料', description: '五行气息均衡的特殊石材。' },
  { id: 'blood-crystal', name: '血煞晶', type: '材料', category: ItemCategory.MATERIAL, quality: '稀有', materialKind: '特殊材料', description: '血煞洞天凝成的危险晶体。' },
  { id: 'artifact-embryo', name: '法宝胚胎', type: '材料', category: ItemCategory.MATERIAL, quality: '极品', materialKind: '特殊材料', description: '可承载本命温养的珍贵胚材。' },
]
