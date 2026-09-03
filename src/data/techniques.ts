import type { CultivationPathId, SpiritElement, TechniqueDefinition, TechniqueGrade } from '../models'

type Seed = [string, string, TechniqueGrade, SpiritElement[], CultivationPathId[], number, number, number, string]
const seeds: Seed[] = [
  ['metal-edge', '庚金锐气诀', '黄阶', ['金'], ['dao', 'sword'], 1.05, 10, .9, '凝庚金锐气，攻伐凌厉。'],
  ['verdant-life', '青木长生功', '玄阶', ['木'], ['dao'], 1.10, 12, 1, '汲草木生机，绵长温和。'],
  ['deep-water', '玄水归元经', '玄阶', ['水'], ['dao'], 1.10, 12, 1, '水行周天，善于调息。'],
  ['blazing-sun', '赤阳焚天典', '地阶', ['火'], ['dao', 'demonic'], 1.18, 14, 1.15, '烈火炼气，进境迅猛。'],
  ['mountain-body', '厚土镇岳功', '玄阶', ['土'], ['body'], 1.08, 14, .55, '以厚土之意锻骨镇身。'],
  ['thunder-sword', '九霄雷剑录', '地阶', ['雷'], ['sword'], 1.22, 16, 1.05, '引雷入剑，至刚至捷。'],
  ['frost-mirror', '太阴冰魄经', '地阶', ['冰'], ['dao', 'ghost'], 1.17, 15, 1, '冰魄澄心，凝练神魂。'],
  ['wind-shadow', '扶摇御风诀', '玄阶', ['风'], ['sword', 'dao'], 1.12, 13, .9, '身随风动，来去无迹。'],
  ['dark-ghost', '幽冥养魂篇', '地阶', ['暗'], ['ghost'], 1.16, 15, .35, '借幽冥阴气稳定魂体。'],
  ['light-vow', '大光明净世法', '天阶', ['光'], ['dao'], 1.24, 18, 1.1, '光明澄澈，破妄净邪。'],
  ['wood-fire-alchemy', '木火丹元录', '地阶', ['木', '火'], ['dao'], 1.20, 15, 1, '木生火旺，以丹火养元。'],
  ['water-wood-life', '青木长生诀', '地阶', ['木', '水'], ['dao'], 1.17, 16, 1, '水木相生，偏重寿元与恢复。'],
  ['metal-water-sword', '金水流锋诀', '地阶', ['金', '水'], ['sword'], 1.21, 16, 1.05, '金锋藏于流水，剑势无常。'],
  ['earth-fire-body', '地火熔身法', '地阶', ['土', '火'], ['body', 'demonic'], 1.18, 16, .55, '引地火熔炼血肉筋骨。'],
  ['wind-thunder', '风雷遁甲经', '天阶', ['风', '雷'], ['sword', 'dao'], 1.27, 18, 1.1, '风雷相激，遁速绝伦。'],
  ['ice-water', '寒渊万流典', '天阶', ['冰', '水'], ['dao', 'ghost'], 1.25, 18, 1, '万流归寒渊，静中藏变。'],
  ['five-cycle', '五行轮转真经', '天阶', ['金', '木', '水', '火', '土'], ['dao'], 1.32, 20, 1.25, '五行相生，周流不息。'],
  ['plain-breath', '凡尘吐纳法', '黄阶', [], ['dao'], 1.0, 8, .15, '不拘灵根，人人可学的吐纳术。'],
  ['sword-heart', '一剑问心篇', '天阶', [], ['sword'], 1.28, 20, .15, '不问灵根，只问剑心与悟性。'],
  ['vajra-body', '不灭金身诀', '天阶', ['土', '金'], ['body'], 1.24, 20, .3, '气血为炉，锻不灭金身。'],
  ['blood-demon', '血海吞灵经', '天阶', ['水', '暗'], ['demonic'], 1.34, 20, .2, '吞灵夺元，进境极快而后患深重。'],
  ['ghost-lamp', '照魂幽灯录', '玄阶', ['暗', '火'], ['ghost'], 1.14, 14, .25, '以魂火为灯，照见幽冥。'],
  ['sun-moon', '日月同辉典', '天阶', ['光', '暗'], ['dao'], 1.30, 20, 1.2, '调和明暗，衍化日月。'],
  ['spring-thunder', '春雷化生诀', '地阶', ['雷', '木'], ['dao'], 1.18, 15, 1, '春雷发陈，生机勃发。'],
  ['metal-thunder-sword', '庚雷剑典', '天阶', ['金', '雷'], ['sword'], 1.29, 19, 1.05, '庚金承雷，剑出如天刑。'],
  ['star-soul', '星河炼神篇', '天阶', ['光', '水'], ['ghost', 'dao'], 1.26, 18, .65, '观星河炼神，神识浩瀚。'],
]

export const TECHNIQUES: TechniqueDefinition[] = seeds.map(([id, name, grade, elements, preferredPaths, efficiency, maxLevel, rootDependency, description]) => ({
  id, name, grade, description,
  elements: elements.map((element) => ({ element, weight: 1 / Math.max(1, elements.length) })),
  preferredPaths, baseCultivationEfficiency: efficiency, maxLevel, rootDependency,
  minimumAffinity: grade === '天阶' ? 55 : undefined,
  effects: [
    { type: 'cultivation', value: efficiency - 1, description: `修炼效率 ×${efficiency.toFixed(2)}` },
    ...(id === 'water-wood-life' || id === 'verdant-life' ? [{ type: 'recovery', value: .08, description: '寿元与恢复收益提高' }] : []),
    ...(id === 'blood-demon' ? [{ type: 'demonicNature', value: 1, description: '修炼会增加魔性与业力' }] : []),
    ...(id === 'dark-ghost' || id === 'ghost-lamp' ? [{ type: 'soulStability', value: .25, description: '修炼时缓慢温养魂体' }] : []),
    ...(id === 'five-cycle' ? [{ type: 'fiveElementCycle', value: .2, description: '五行相生收益提高' }] : []),
  ],
}))

export const techniqueById = (id: string) => TECHNIQUES.find((technique) => technique.id === id)
