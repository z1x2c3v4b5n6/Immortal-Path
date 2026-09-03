import type { Player } from '../models'

export interface FatePathDefinition {
  id: string
  name: string
  description: string
  evaluation: number
  calculate: (player: Player) => { progress: number; milestones: string[] }
}

const pathLevel = (player: Player, id: NonNullable<Player['primaryPath']>) => player.pathProgress.find((entry) => entry.pathId === id)?.level ?? 0
const eventCount = (player: Player, tag: string) => player.lifeEventHistory.filter((record) => record.tags.includes(tag)).length

export const FATE_PATHS: FatePathDefinition[] = [
  { id: 'sword-legend', name: '剑道传奇', description: '一生以剑问道，剑名终成传说。', evaluation: 100, calculate: (player) => { const milestones = [player.primaryPath === 'sword' ? '以剑修为主道' : '', player.pathResources.swordIntent >= 80 ? '剑意已臻高境' : '', eventCount(player, 'sword') >= 5 ? '历经五次剑道因果' : '', pathLevel(player, 'sword') >= 8 ? '剑道修为深厚' : ''].filter(Boolean); return { progress: Math.min(100, (player.primaryPath === 'sword' ? 25 : 0) + Math.min(25, player.pathResources.swordIntent / 4) + Math.min(25, pathLevel(player, 'sword') * 3) + Math.min(25, eventCount(player, 'sword') * 5)), milestones } } },
  { id: 'five-elements-dao', name: '五行大道', description: '五行轮转，相生不息，自成一条通天大道。', evaluation: 80, calculate: (player) => { const five = player.spiritualAptitude.innateRoot.elements.length === 5; const unity = player.acquiredTalents.some((talent) => talent.talentId === 'five-unity'); const milestones = [five ? '先天五灵根' : '', unity ? '悟得五行归一' : '', eventCount(player, 'five-elements') >= 3 ? '五行因果深厚' : ''].filter(Boolean); return { progress: Math.min(100, (five ? 25 : 0) + (unity ? 60 : 0) + Math.min(15, eventCount(player, 'five-elements') * 5)), milestones } } },
  { id: 'defy-destiny', name: '逆天改命', description: '大限之前不肯低首，以破境重写天命。', evaluation: 90, calculate: (player) => { const talent = player.acquiredTalents.some((entry) => entry.talentId === 'defy-fate'); return { progress: talent ? 100 : Math.min(90, player.nearDeathCount * 18), milestones: [player.nearDeathCount ? `历经 ${player.nearDeathCount} 次死亡危机` : '', talent ? '大限破境，逆改天命' : ''].filter(Boolean) } } },
  { id: 'demonic-overlord', name: '魔道巨擘', description: '以高境界驾驭滔天魔性，威震一方。', evaluation: 110, calculate: (player) => { const milestones = [player.primaryPath === 'demonic' ? '魔修主道' : '', player.pathResources.demonicNature >= 80 ? '魔性滔天' : '', player.realmIndex >= 23 ? '踏入化神之境' : ''].filter(Boolean); return { progress: Math.min(100, (player.primaryPath === 'demonic' ? 25 : 0) + Math.min(35, player.pathResources.demonicNature * .4) + Math.min(25, player.realmIndex) + Math.min(15, eventCount(player, 'demonic') * 3)), milestones } } },
  { id: 'longevity-road', name: '长生之路', description: '不只追逐境界，更将一生修成绵长不绝的长生路。', evaluation: 70, calculate: (player) => { const longevity = player.talents.some((talent) => talent.id === 'longevity') || player.knownTechniques.includes('water-wood-life'); const age = Math.floor(player.ageMonths / 12); const milestones = [longevity ? '身负长寿体系' : '', age >= 300 ? '已历三百载' : '', player.realmIndex >= 19 ? '化神在望' : ''].filter(Boolean); return { progress: Math.min(100, (longevity ? 30 : 0) + Math.min(35, age / 10) + Math.min(25, player.realmIndex * 1.5) + Math.min(10, eventCount(player, 'longevity') * 2)), milestones } } },
]

export const fatePathById = (id: string) => FATE_PATHS.find((path) => path.id === id)
