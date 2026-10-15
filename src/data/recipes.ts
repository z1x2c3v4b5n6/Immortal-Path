import type { Recipe } from '../models'

export const RECIPES: Recipe[] = [
  { id: 'make-qi-pill', name: '炼制聚气丹', resultItemId: 'qi-pill', resultAmount: 1, materials: [{ itemId: 'green-spirit-herb', amount: 3 }] },
  { id: 'make-healing-pill', name: '炼制疗伤丹', resultItemId: 'healing-pill', resultAmount: 1, materials: [{ itemId: 'green-spirit-herb', amount: 4 }, { itemId: 'beast-bone', amount: 1 }] },
  { id: 'forge-green-edge', name: '炼制青锋剑', resultItemId: 'green-edge-weapon', resultAmount: 1, materials: [{ itemId: 'black-iron', amount: 3 }, { itemId: 'beast-bone', amount: 2 }] },
  { id: 'make-void-treasure', name: '炼制遁空符宝', resultItemId: 'void-treasure', resultAmount: 1, materials: [{ itemId: 'five-element-stone', amount: 2 }, { itemId: 'yin-soul-sand', amount: 2 }], requirements: [{ type: 'REALM', value: 11 }] },
]

export const recipeById = (id: string) => RECIPES.find((entry) => entry.id === id)
