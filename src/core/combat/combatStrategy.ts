import { CombatStrategy } from '../../models'

export interface CombatStrategyRule {
  id: CombatStrategy
  name: string
  description: string
  offense: number
  defense: number
  survival: number
  deathRisk: number
}

export const COMBAT_STRATEGIES: CombatStrategyRule[] = [
  { id: CombatStrategy.CAUTIOUS, name: '稳健', description: '先求不败，防守与生存提高，但杀伐稍弱。', offense: .86, defense: 1.24, survival: .16, deathRisk: -.08 },
  { id: CombatStrategy.BALANCED, name: '寻常应对', description: '攻守相济，不额外承担代价。', offense: 1, defense: 1, survival: 0, deathRisk: 0 },
  { id: CombatStrategy.AGGRESSIVE, name: '激进', description: '抢占先机，输出提高，受伤风险也会增加。', offense: 1.2, defense: .83, survival: -.06, deathRisk: .05 },
  { id: CombatStrategy.DESPERATE, name: '拼命', description: '倾尽底蕴爆发，胜负往往就在一线之间。', offense: 1.42, defense: .68, survival: -.14, deathRisk: .15 },
  { id: CombatStrategy.ESCAPE, name: '遁逃', description: '避战求生，能否脱身取决于境界、状态与气运。', offense: .35, defense: 1.1, survival: .25, deathRisk: -.12 },
]

export const combatStrategyById = (id: CombatStrategy) => COMBAT_STRATEGIES.find((entry) => entry.id === id)!
