import type { RealmDefinition } from '../models'

const stages = ['初期', '中期', '后期', '圆满']

export const REALMS: RealmDefinition[] = [
  { id: 'mortal', name: '凡人', group: '凡人', cultivationRequired: 90, baseLifespanYears: 92, breakthroughBaseChance: 0.92, cultivationBase: 7 },
  ...Array.from({ length: 10 }, (_, index): RealmDefinition => ({
    id: `qi-${index + 1}`, name: `炼气 ${index + 1}层`, group: '炼气', cultivationRequired: 150 + index * 105,
    baseLifespanYears: 112 + index * 2, breakthroughBaseChance: 0.82 - index * 0.025, cultivationBase: 11 + index * 2,
  })),
  ...(['筑基', '金丹', '元婴'] as const).flatMap((group, groupIndex) => stages.map((stage, stageIndex): RealmDefinition => {
    const base = [1450, 5800, 18000][groupIndex]
    return {
      id: `${['foundation', 'core', 'nascent'][groupIndex]}-${stageIndex}`,
      name: `${group}·${stage}`,
      group,
      cultivationRequired: base * (stageIndex + 1),
      baseLifespanYears: [230, 600, 1100][groupIndex] + stageIndex * [22, 55, 100][groupIndex],
      breakthroughBaseChance: [0.58, 0.43, 0.3][groupIndex] - stageIndex * 0.035,
      cultivationBase: [45, 125, 360][groupIndex] * (1 + stageIndex * 0.24),
    }
  })),
]

export const realmName = (index: number) => REALMS[Math.min(index, REALMS.length - 1)].name
export const isMajorBreakthrough = (nextIndex: number) => nextIndex === 1 || nextIndex === 11 || nextIndex === 15 || nextIndex === 19
