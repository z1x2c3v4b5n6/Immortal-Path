import type { Sect, TerritoryState } from '../../models'
import type { RandomService } from '../random/RandomService'

const seeds: Array<[string, TerritoryState['resourceType']]> = [['青云山脉', '灵药'], ['白石灵脉', '灵矿'], ['赤炎谷', '火精'], ['阴魂岭', '魂晶'], ['十万大山', '妖兽材料']]

export function generateTerritories(sects: Sect[], rng: RandomService): TerritoryState[] {
  return seeds.map(([name, resourceType], index) => ({ id: `territory-${index + 1}`, name, resourceType, abundance: rng.randomInt(45, 95), reserves: rng.randomInt(500, 1800), controllerType: index < sects.length ? '宗门' : '无主', controllerId: sects[index]?.id }))
}

export function simulateTerritories(territories: TerritoryState[], sects: Sect[], months: number, rng: RandomService) {
  for (const territory of territories) {
    if (!territory.controllerId) continue
    const sect = sects.find((entry) => entry.id === territory.controllerId)
    if (!sect) continue
    const yieldAmount = Math.min(territory.reserves, Math.max(1, Math.round(months / 12 * territory.abundance / 12)))
    territory.reserves -= yieldAmount
    sect.resources += yieldAmount
    territory.abundance = Math.max(10, Math.min(100, territory.abundance + rng.randomInt(-2, 2)))
  }
}

