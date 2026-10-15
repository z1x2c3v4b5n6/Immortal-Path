import type { SecretRealmDefinition, SecretRealmEncounter } from '../models'

const encounter = (id: string, name: string, description: string, type: SecretRealmEncounter['type'], risk: number, rewards: SecretRealmEncounter['rewards'], extra: Partial<SecretRealmEncounter> = {}): SecretRealmEncounter => ({ id, name, description, type, risk, rewards, ...extra })

export const SECRET_REALMS: SecretRealmDefinition[] = [
  {
    id: 'azure-cloud', name: '青云秘境', description: '云海深处的古老药园，灵气温和却仍有妖兽盘踞。', recommendedRealm: '炼气后期', recommendedRealmIndex: 7, recommendedCombatPower: 330, maxDepth: 4, environmentTags: ['云海', '灵药', '道修'], preferredPaths: ['dao'],
    encounters: [
      encounter('azure-herb-valley', '灵药谷', '云雾间生长着成片青灵草。', 'RESOURCE', 1, [{ itemId: 'green-spirit-herb', quantity: 5 }]),
      encounter('azure-wolf-den', '妖狼巢穴', '赤目妖狼守住了通往深处的石阶。', 'COMBAT', 2, [{ itemId: 'core', quantity: 1 }, { itemId: 'wolf-hide', quantity: 2 }], { enemyType: 'beast', enemyDifficulty: 0 }),
      encounter('azure-cave', '古修洞府', '残阵之后，一柄寒光飞剑静悬于石台。', 'TREASURE', 2, [{ itemId: 'frost-edge-sword', quantity: 1 }, { itemId: 'black-iron', quantity: 1 }]),
      encounter('azure-cloud-beast', '云海守关兽', '云海翻涌，守关灵兽踏风而来。', 'COMBAT', 3, [{ itemId: 'spirit-gathering-disc', quantity: 1 }, { itemId: 'green-spirit-herb', quantity: 6 }], { enemyType: 'beast', enemyDifficulty: 1 }),
    ],
  },
  {
    id: 'myriad-sword', name: '万剑冢', description: '万柄残剑沉睡于荒原，每一步都可能引来剑意反噬。', recommendedRealm: '筑基中期', recommendedRealmIndex: 13, recommendedCombatPower: 1000, maxDepth: 5, environmentTags: ['剑冢', '金', '剑意'], preferredPaths: ['sword'],
    encounters: [
      encounter('sword-fragments', '断剑原', '残剑间可寻得尚有灵性的玄铁。', 'RESOURCE', 2, [{ itemId: 'black-iron', quantity: 3 }]),
      encounter('sword-intent', '剑意石林', '无形剑意切割神识，亦磨砺剑心。', 'EVENT', 2, [{ itemId: 'sword-manual', quantity: 1 }]),
      encounter('sword-guardian', '守冢剑傀', '剑傀无言拔剑，唯有胜者可再前行。', 'COMBAT', 3, [{ itemId: 'five-element-stone', quantity: 2 }], { enemyType: 'cultivator', enemyDifficulty: 1 }),
      encounter('frost-sword-seat', '青霜剑台', '寒霜凝结于古剑之上，静候有缘人。', 'TREASURE', 3, [{ itemId: 'frost-edge-sword', quantity: 1 }]),
      encounter('sword-master-shadow', '剑主残影', '古代剑主残影携万剑齐落。', 'COMBAT', 4, [{ itemId: 'frost-edge-sword', quantity: 1 }, { itemId: 'artifact-embryo', quantity: 1 }], { enemyType: 'rival', enemyDifficulty: 2 }),
    ],
  },
  {
    id: 'five-element-ruins', name: '五行遗府', description: '五座殿宇按生克之理轮转，失衡者寸步难行。', recommendedRealm: '筑基初期', recommendedRealmIndex: 11, recommendedCombatPower: 760, maxDepth: 4, environmentTags: ['五行', '阵法', '传承'], preferredPaths: ['dao'],
    encounters: [
      encounter('elements-gate', '五行门', '五色禁制随灵根气息变化。', 'HAZARD', 2, [{ itemId: 'five-element-stone', quantity: 2 }], { injuryChance: .18 }),
      encounter('elements-spirits', '五灵殿', '五只元素精怪共同守阵。', 'COMBAT', 2, [{ itemId: 'five-element-stone', quantity: 3 }], { enemyType: 'beast', enemyDifficulty: 0 }),
      encounter('elements-stele', '五行道碑', '碑文阐述五行归一之理。', 'EVENT', 2, [{ itemId: 'five-element-pill', quantity: 1 }]),
      encounter('elements-core', '归一阵眼', '五色灵珠悬于阵眼中央。', 'TREASURE', 3, [{ itemId: 'five-element-orb', quantity: 1 }, { itemId: 'five-element-stone', quantity: 4 }]),
    ],
  },
  {
    id: 'blood-fiend', name: '血煞洞天', description: '血河横空，魔念无处不在；贪念越重，回报与死劫越近。', recommendedRealm: '金丹初期', recommendedRealmIndex: 15, recommendedCombatPower: 1800, maxDepth: 4, environmentTags: ['血煞', '魔道', '高危'], preferredPaths: ['demonic'],
    encounters: [
      encounter('blood-shore', '血河岸', '血煞晶在河滩上散发妖异红光。', 'RESOURCE', 2, [{ itemId: 'blood-crystal', quantity: 3 }]),
      encounter('blood-raider', '血衣魔修', '一名血衣修士盯上了你的收获。', 'COMBAT', 3, [{ itemId: 'qi-burst-pill', quantity: 2 }], { enemyType: 'cultivator', enemyDifficulty: 1 }),
      encounter('blood-altar', '血祭古坛', '古坛可赐力量，也可能吞噬来者。', 'HAZARD', 4, [{ itemId: 'blood-fiend-pearl', quantity: 1 }], { injuryChance: .42 }),
      encounter('blood-lord', '洞天血主', '血海凝成的人影挡在洞天核心。', 'COMBAT', 4, [{ itemId: 'blood-fiend-pearl', quantity: 1 }, { itemId: 'artifact-embryo', quantity: 1 }], { enemyType: 'sect', enemyDifficulty: 2 }),
    ],
  },
  {
    id: 'nether-tomb', name: '幽冥古墓', description: '墓道通往幽冥裂隙，魂火照见生者最深的恐惧。', recommendedRealm: '筑基后期', recommendedRealmIndex: 14, recommendedCombatPower: 1250, maxDepth: 4, environmentTags: ['古墓', '阴气', '魂魄'], preferredPaths: ['ghost'],
    encounters: [
      encounter('nether-sand', '阴砂墓道', '墓砖缝隙积满可供魂修使用的阴魂砂。', 'RESOURCE', 2, [{ itemId: 'yin-soul-sand', quantity: 4 }]),
      encounter('nether-ghost', '无名怨魂', '怨魂被生者气息惊醒。', 'COMBAT', 3, [{ itemId: 'yin-soul-sand', quantity: 2 }, { itemId: 'soul-nourishing-lamp', quantity: 1 }], { enemyType: 'beast', enemyDifficulty: 1 }),
      encounter('nether-coffin', '镇魂石棺', '棺中铃音轻响，神魂随之安定。', 'TREASURE', 3, [{ itemId: 'soul-calming-bell', quantity: 1 }]),
      encounter('nether-lord', '幽冥墓主', '墓主残魂要夺取你的躯壳重返人间。', 'COMBAT', 4, [{ itemId: 'soul-calming-bell', quantity: 1 }, { itemId: 'artifact-embryo', quantity: 1 }], { enemyType: 'cultivator', enemyDifficulty: 2 }),
    ],
  },
]

export const secretRealmById = (id: string) => SECRET_REALMS.find((entry) => entry.id === id)
