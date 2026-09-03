import type { WorldEraId, WorldStrengthLevel, WorldTrait } from '../models'

export const WORLD_ERAS: Record<WorldEraId, { name: string; description: string; qi: number; eventFrequency: number; heavenlyChance: number }> = {
  DECLINING: { name: '末法时代', description: '灵气衰退，高阶资源难寻。', qi: .82, eventFrequency: .88, heavenlyChance: .7 },
  NORMAL: { name: '寻常修仙纪元', description: '天地运转有序，仙路兴衰相半。', qi: 1, eventFrequency: 1, heavenlyChance: 1 },
  PROSPEROUS: { name: '修仙盛世', description: '灵脉活跃，天骄与秘境渐多。', qi: 1.14, eventFrequency: 1.12, heavenlyChance: 1.25 },
  GOLDEN: { name: '黄金大世', description: '万道争鸣，稀世资质频现。', qi: 1.28, eventFrequency: 1.25, heavenlyChance: 1.6 },
}

export const WORLD_STRENGTHS: Record<WorldStrengthLevel, { name: string; description: string; npcRealmBias: number; resource: number; danger: number }> = {
  BARREN: { name: '贫瘠', description: '元婴已足以镇压一域。', npcRealmBias: -.2, resource: .78, danger: .84 },
  COMMON: { name: '普通', description: '修仙传承有序，高阶修士少见。', npcRealmBias: 0, resource: .94, danger: .95 },
  THRIVING: { name: '繁盛', description: '大修士与高阶传承时有现世。', npcRealmBias: .12, resource: 1.08, danger: 1.05 },
  POWERFUL: { name: '强盛', description: '元婴并不罕见，化神可见。', npcRealmBias: .25, resource: 1.2, danger: 1.16 },
  SUPREME: { name: '极盛', description: '炼虚传承仍存，大能辈出。', npcRealmBias: .4, resource: 1.34, danger: 1.28 },
}

export const WORLD_TRAITS: WorldTrait[] = [
  { id: 'martial', name: '武道昌盛', description: '体修更易成长，炼体资源充沛。', weight: 10, modifiers: [{ type: 'pathCultivation', pathId: 'body', value: .2 }, { type: 'statGrowth', pathId: 'body', value: .15 }, { type: 'pathWeight', pathId: 'body', value: 10 }] },
  { id: 'sword-age', name: '剑道盛世', description: '剑修传承众多，剑道机缘频现。', weight: 10, modifiers: [{ type: 'pathCultivation', pathId: 'sword', value: .2 }, { type: 'pathEvent', pathId: 'sword', value: .3 }, { type: 'pathWeight', pathId: 'sword', value: 10 }] },
  { id: 'demonic-rise', name: '魔道猖獗', description: '魔修活跃，危险与邪道资源并生。', weight: 7, incompatibleWith: ['righteous'], modifiers: [{ type: 'pathCultivation', pathId: 'demonic', value: .14 }, { type: 'pathEvent', pathId: 'demonic', value: .45 }, { type: 'pathWeight', pathId: 'demonic', value: 12 }, { type: 'danger', value: .1 }] },
  { id: 'ghost-rise', name: '鬼道昌盛', description: '阴气汇聚，魂道机缘增多。', weight: 7, modifiers: [{ type: 'pathCultivation', pathId: 'ghost', value: .18 }, { type: 'pathEvent', pathId: 'ghost', value: .4 }, { type: 'pathWeight', pathId: 'ghost', value: 12 }, { type: 'yinQi', value: .25 }] },
  { id: 'righteous', name: '正道鼎盛', description: '道修传承稳定，魔修行事受限。', weight: 9, incompatibleWith: ['demonic-rise'], modifiers: [{ type: 'pathCultivation', pathId: 'dao', value: .12 }, { type: 'pathWeight', pathId: 'dao', value: 10 }, { type: 'pathWeight', pathId: 'demonic', value: -7 }] },
  { id: 'rich-qi', name: '灵气浓郁', description: '所有活人道途的正常修炼更快。', weight: 11, incompatibleWith: ['depleted-qi'], modifiers: [{ type: 'globalCultivation', value: .15 }] },
  { id: 'depleted-qi', name: '灵气枯竭', description: '吐纳艰难，资源争夺更加频繁。', weight: 8, incompatibleWith: ['rich-qi'], modifiers: [{ type: 'globalCultivation', value: -.16 }, { type: 'danger', value: .08 }] },
  { id: 'herbs-rich', name: '灵药丰富', description: '灵药资源与相关机缘增加。', weight: 9, incompatibleWith: ['herbs-poor'], modifiers: [{ type: 'resource', value: .18 }] },
  { id: 'herbs-poor', name: '灵药贫瘠', description: '灵药难寻，丹药相关资源减少。', weight: 7, incompatibleWith: ['herbs-rich'], modifiers: [{ type: 'resource', value: -.14 }] },
  { id: 'beasts', name: '妖兽横行', description: '历练更加危险，但战斗与炼体资源丰富。', weight: 9, modifiers: [{ type: 'danger', value: .18 }, { type: 'resource', value: .13 }, { type: 'pathEvent', pathId: 'body', value: .22 }] },
  { id: 'peace', name: '天下太平', description: '低风险机缘增加，高危事件减少。', weight: 8, incompatibleWith: ['strife'], modifiers: [{ type: 'danger', value: -.18 }, { type: 'eventFrequency', value: -.06 }] },
  { id: 'strife', name: '大争之世', description: '高风险事件与稀有机缘一同增加。', weight: 8, incompatibleWith: ['peace'], modifiers: [{ type: 'danger', value: .2 }, { type: 'rareEvent', value: .22 }, { type: 'eventFrequency', value: .14 }] },
  { id: 'thunder', name: '雷劫猛烈', description: '大境界天劫更凶，雷属性机缘增多。', weight: 7, modifiers: [{ type: 'breakthrough', value: -.05 }, { type: 'danger', value: .08 }] },
  { id: 'soul-age', name: '神魂昌盛', description: '神识与魂道更易成长。', weight: 8, modifiers: [{ type: 'statGrowth', value: .14 }, { type: 'pathCultivation', pathId: 'ghost', value: .1 }] },
  { id: 'frail', name: '肉身孱弱', description: '此界平均体魄偏低，体修更为稀少。', weight: 6, incompatibleWith: ['martial'], modifiers: [{ type: 'pathCultivation', pathId: 'body', value: -.13 }, { type: 'pathWeight', pathId: 'body', value: -8 }] },
  { id: 'ancient-ruins', name: '古迹遍地', description: '残存传承众多，探索收益与风险提高。', weight: 8, modifiers: [{ type: 'resource', value: .12 }, { type: 'rareEvent', value: .15 }, { type: 'danger', value: .08 }] },
]

export const eraName = (era: WorldEraId) => WORLD_ERAS[era].name
export const strengthName = (strength: WorldStrengthLevel) => WORLD_STRENGTHS[strength].name
