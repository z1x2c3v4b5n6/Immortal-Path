import { TECHNIQUES } from '../../data/techniques'
import type { Player, Sect, SectMembership, SectType } from '../../models'
import { createSeededRandom, type RandomService } from '../random/RandomService'
import { SECT_STYLES, SECT_TYPE_PATH, sectPositionForRealm } from './sect'
import { SECT_POSITIONS } from './sect'

const sectSeeds: Array<[string, SectType, string]> = [
  ['天剑门', '剑宗', '问剑峰'], ['丹霞谷', '丹宗', '丹霞谷'], ['千机阁', '器宗', '赤炼城'], ['大觉寺', '佛门', '须弥山'],
  ['血魔宗', '魔宗', '血河原'], ['幽冥殿', '鬼宗', '阴魂岭'], ['撼岳门', '体宗', '镇岳山'], ['四海散修盟', '散修联盟', '白石城'],
]

export function createSect(id: string, name: string, type: SectType, rank: number, location: string, rng: RandomService): Sect {
  const path = SECT_TYPE_PATH[type]
  const compatible = TECHNIQUES.filter((technique) => technique.preferredPaths.includes(path))
  const techniqueIds = [...compatible].slice(0, Math.max(2, rank + 2)).map((entry) => entry.id)
  const power = Math.min(100, 18 + rank * 18 + rng.randomInt(0, 14))
  return { id, name, type, rank, location, members: rng.randomInt(80, 300) * (rank + 1), resources: rng.randomInt(150, 450) * (rank + 1), fame: Math.min(100, 15 + rank * 20 + rng.randomInt(0, 12)), style: SECT_STYLES[type], power, status: power >= 78 ? '鼎盛' : power >= 56 ? '昌盛' : power >= 36 ? '守成' : '衰微', techniqueIds }
}

export function generateSects(seed: string): Sect[] {
  const rng = createSeededRandom(`${seed}:sects`)
  return sectSeeds.map(([name, type, location], index) => createSect(`sect-${index + 1}-${name}`, name, type, index === 0 ? 3 : rng.randomInt(1, 4), location, rng))
}

export function canJoinSect(player: Player, sect: Sect) {
  if (!player.alive || player.sectMembership) return false
  if (player.realmIndex === 0) return sect.rank <= 1
  return player.realmIndex + 1 >= Math.max(1, sect.rank - 1)
}

export function joinSect(player: Player, sect: Sect, year: number): SectMembership | undefined {
  if (!canJoinSect(player, sect)) return undefined
  const membership = { sectId: sect.id, position: sectPositionForRealm(player.realmIndex), contribution: 0, joinedYear: year } satisfies SectMembership
  player.sectMembership = membership
  sect.members++
  return membership
}

export function addSectContribution(player: Player, amount: number) {
  if (!player.sectMembership || amount <= 0) return undefined
  player.sectMembership.contribution += Math.floor(amount)
  player.sectMembership.position = sectPositionForRealm(player.realmIndex, player.sectMembership.contribution)
  return player.sectMembership
}

export function updateSectPosition(player: Player) {
  if (!player.sectMembership) return undefined
  player.sectMembership.position = sectPositionForRealm(player.realmIndex, player.sectMembership.contribution)
  return player.sectMembership.position
}

export function techniqueContributionCost(techniqueId: string) {
  const grade = TECHNIQUES.find((entry) => entry.id === techniqueId)?.grade
  return grade === '天阶' ? 900 : grade === '地阶' ? 450 : grade === '玄阶' ? 180 : 60
}

export function canAccessSectTechnique(player: Player, techniqueId: string) {
  if (!player.sectMembership) return false
  const grade = TECHNIQUES.find((entry) => entry.id === techniqueId)?.grade
  const required = grade === '天阶' ? 3 : grade === '地阶' ? 2 : grade === '玄阶' ? 1 : 0
  return SECT_POSITIONS.indexOf(player.sectMembership.position) >= required
}

export function sectStipend(player: Player, sect: Sect, years: number) {
  if (!player.sectMembership || years <= 0) return 0
  const rank = SECT_POSITIONS.indexOf(player.sectMembership.position) + 1
  const amount = Math.min(sect.resources, Math.floor(years * rank * (2 + sect.rank)))
  sect.resources -= amount
  return amount
}
