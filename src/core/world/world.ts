import { WORLD_ERAS, WORLD_STRENGTHS, WORLD_TRAITS } from '../../data/worldTraits'
import type { ContinentState, CultivationPathId, WorldEraId, WorldState, WorldStrengthLevel, WorldTrait } from '../../models'
import { createSeededRandom, generateWorldSeed, hashSeed, random, type RandomService } from '../random/RandomService'
import { generateSects } from '../sect/sectManager'
import { initialSectRelations } from '../sect/sectRelation'
import { generateNPCCultivator, simulateNPCCultivator } from '../npc/npcCultivator'
import { generateTerritories, simulateTerritories } from './territories'
import { simulateFamilies } from '../family/familyManager'

const namePrefixes = ['玄', '太', '九', '天', '幽', '苍', '赤', '灵', '北', '云', '青', '紫', '沧', '星', '归']
const nameBodies = ['苍', '虚', '霄', '玄', '冥', '莽', '霄', '墟', '荒', '梦', '岳', '渊', '澜', '辰', '元']
const resourceNames = ['灵药', '矿脉', '魂晶', '妖兽材料', '剑道遗藏', '古修洞府']
const pathIds: CultivationPathId[] = ['dao', 'sword', 'body', 'demonic', 'ghost']
const eraWeights: Array<{ value: WorldEraId; weight: number }> = [
  { value: 'DECLINING', weight: 17 }, { value: 'NORMAL', weight: 45 }, { value: 'PROSPEROUS', weight: 29 }, { value: 'GOLDEN', weight: 9 },
]
const strengthWeights: Array<{ value: WorldStrengthLevel; weight: number }> = [
  { value: 'BARREN', weight: 12 }, { value: 'COMMON', weight: 34 }, { value: 'THRIVING', weight: 30 }, { value: 'POWERFUL', weight: 18 }, { value: 'SUPREME', weight: 6 },
]

const happenings = [
  '青云宗新开山门，广纳门徒。', '血魔宗与天剑门爆发大战。', '北海潮退，露出古修遗迹。', '丹霞谷炼出一炉延寿灵丹。',
  '十万大山兽潮涌动。', '太虚秘境重现于世。', '天剑门老祖坐化，诸峰缟素。', '散修盟在白石城立下分坛。',
  '中州灵脉异动，灵气渐盛。', '血魔宗一夜覆灭，原因不明。', '有元婴修士横渡东海。', '青云宗与丹霞谷结为同盟。',
]

function selectTraits(rng: RandomService, count: number): WorldTrait[] {
  const selected: WorldTrait[] = []
  while (selected.length < count) {
    const candidates = WORLD_TRAITS.filter((trait) => !selected.some((entry) => entry.id === trait.id || entry.incompatibleWith?.includes(trait.id) || trait.incompatibleWith?.includes(entry.id)))
    if (!candidates.length) break
    selected.push(rng.weightedRandom(candidates.map((trait) => ({ value: trait, weight: trait.weight }))))
  }
  return selected.map((trait) => structuredClone(trait))
}

function normalizeDistribution(weights: Record<CultivationPathId, number>): Record<CultivationPathId, number> {
  const safe = Object.fromEntries(pathIds.map((id) => [id, Math.max(1, weights[id])])) as Record<CultivationPathId, number>
  const total = Object.values(safe).reduce((sum, value) => sum + value, 0)
  const exact = pathIds.map((id) => ({ id, value: safe[id] / total * 100 }))
  const result = Object.fromEntries(exact.map(({ id, value }) => [id, Math.floor(value)])) as Record<CultivationPathId, number>
  let remaining = 100 - Object.values(result).reduce((sum, value) => sum + value, 0)
  for (const entry of [...exact].sort((a, b) => (b.value % 1) - (a.value % 1))) {
    if (!remaining) break
    result[entry.id]++
    remaining--
  }
  return result
}

export function generateContinent(seed: string): ContinentState {
  const normalizedSeed = seed.trim().toUpperCase() || 'XJ-00000000'
  const rng = createSeededRandom(normalizedSeed)
  const era = rng.weightedRandom(eraWeights)
  const strengthLevel = rng.weightedRandom(strengthWeights)
  const traits = selectTraits(rng, rng.randomInt(3, 5))
  const pathWeights: Record<CultivationPathId, number> = { dao: 34, sword: 23, body: 20, demonic: 13, ghost: 10 }
  for (const trait of traits) for (const modifier of trait.modifiers) if (modifier.type === 'pathWeight' && modifier.pathId) pathWeights[modifier.pathId] += modifier.value
  const modifierSum = (type: string) => traits.flatMap((trait) => trait.modifiers).filter((modifier) => modifier.type === type).reduce((sum, modifier) => sum + modifier.value, 0)
  const eraRule = WORLD_ERAS[era]
  const strengthRule = WORLD_STRENGTHS[strengthLevel]
  const prefix = rng.pick(namePrefixes)
  let body = rng.pick(nameBodies)
  if (body === prefix) body = rng.pick(nameBodies.filter((value) => value !== prefix))
  return {
    id: `continent-${hashSeed(normalizedSeed).toString(36)}`,
    name: `${prefix}${body}大陆`,
    era,
    strengthLevel,
    traits,
    cultivationEnvironment: {
      spiritualQiMultiplier: Number(Math.max(.65, Math.min(1.45, eraRule.qi * (1 + modifierSum('globalCultivation')))).toFixed(3)),
      yinQiMultiplier: Number(Math.max(.7, Math.min(1.5, 1 + modifierSum('yinQi'))).toFixed(3)),
      dangerMultiplier: Number(Math.max(.65, Math.min(1.55, strengthRule.danger * (1 + modifierSum('danger')))).toFixed(3)),
      resourceMultiplier: Number(Math.max(.65, Math.min(1.55, strengthRule.resource * (1 + modifierSum('resource')))).toFixed(3)),
      eventFrequencyMultiplier: Number(Math.max(.75, Math.min(1.4, eraRule.eventFrequency * (1 + modifierSum('eventFrequency')))).toFixed(3)),
    },
    pathDistribution: normalizeDistribution(pathWeights),
    resourceTendency: rng.pick(resourceNames),
  }
}

export function stableLegacySeed(value: unknown): string {
  const serialized = JSON.stringify(value ?? {})
  const hash = hashSeed(serialized).toString().padStart(8, '0').slice(-8)
  return `LG-${hash}`
}

export function createWorld(seed = generateWorldSeed(random)): WorldState {
  const normalizedSeed = seed.trim().toUpperCase() || generateWorldSeed(random)
  const socialRandom = createSeededRandom(`${normalizedSeed}:society`)
  const sects = generateSects(normalizedSeed)
  const npcCultivators = sects.flatMap((sect) => Array.from({ length: 3 }, () => generateNPCCultivator(socialRandom, 100, sect)))
  return {
    seed: normalizedSeed,
    continent: generateContinent(normalizedSeed),
    currentYear: 100, currentMonth: 1, eraName: '玄历', worldEvents: [],
    sects, npcs: [], npcCultivators, relationships: [], sectRelations: initialSectRelations(sects, 100), territories: generateTerritories(sects, socialRandom), masterDisciples: [], descendants: [], families: [],
  }
}

export function getWorldModifier(world: WorldState, type: string, pathId?: CultivationPathId): number {
  return world.continent.traits.flatMap((trait) => trait.modifiers).filter((modifier) => modifier.type === type && (!modifier.pathId || modifier.pathId === pathId)).reduce((sum, modifier) => sum + modifier.value, 0)
}

export function getWorldPathMultiplier(world: WorldState, pathId?: CultivationPathId): number {
  if (!pathId) return Math.max(.75, Math.min(1.35, world.continent.cultivationEnvironment.spiritualQiMultiplier))
  const base = pathId === 'ghost' ? world.continent.cultivationEnvironment.yinQiMultiplier : world.continent.cultivationEnvironment.spiritualQiMultiplier
  return Number(Math.max(.7, Math.min(1.4, base * (1 + getWorldModifier(world, 'pathCultivation', pathId)))).toFixed(3))
}

export function simulateWorld(world: WorldState, months: number, rng: RandomService) {
  const frequency = world.continent.cultivationEnvironment.eventFrequencyMultiplier
  const eventCount = Math.min(8, Math.floor(months / 24 * frequency) + (rng.chance(Math.min(.8, months / 24 * frequency)) ? 1 : 0))
  const dominantPath = pathIds.reduce((best, id) => world.continent.pathDistribution[id] > world.continent.pathDistribution[best] ? id : best, 'dao' as CultivationPathId)
  const pathNews: Record<CultivationPathId, string> = { dao: '正道修士在云台论法。', sword: '剑修于断崖试剑，剑光彻夜不散。', body: '炼体强者横渡兽潮，名动四方。', demonic: '魔道踪迹再现，诸城戒严。', ghost: '北境阴脉翻涌，魂灯无风自明。' }
  for (let index = 0; index < eventCount; index++) {
    const yearOffset = months > 12 ? rng.randomInt(0, Math.max(0, Math.floor(months / 12) - 1)) : 0
    const text = rng.chance(.28) ? pathNews[dominantPath] : rng.pick(happenings)
    world.worldEvents.unshift({ id: crypto.randomUUID(), year: world.currentYear + yearOffset, text })
  }
  world.worldEvents = world.worldEvents.slice(0, 100)
  for (const sect of world.sects) {
    sect.power = Math.max(10, Math.min(100, sect.power + rng.randomInt(-2, 3)))
    sect.resources = Math.max(0, sect.resources + Math.round(months / 12 * (sect.rank + 1) - sect.members / 500))
    sect.fame = Math.max(0, Math.min(100, sect.fame + rng.randomInt(-1, 1)))
    sect.status = sect.power > 75 ? '鼎盛' : sect.power > 55 ? '昌盛' : sect.power > 35 ? '守成' : '衰微'
  }
  simulateTerritories(world.territories, world.sects, months, rng)
  simulateFamilies(world.families, months)
  for (const npc of world.npcCultivators) {
    const wasAlive = npc.alive; const realmBefore = npc.realmIndex
    simulateNPCCultivator(npc, months, world.currentYear + Math.floor(months / 12), rng)
    if (wasAlive && !npc.alive) world.worldEvents.unshift({ id: crypto.randomUUID(), year: npc.deathYear ?? world.currentYear, text: `${npc.sectId ? world.sects.find((sect) => sect.id === npc.sectId)?.name ?? '某宗' : '散修'}修士${npc.name}寿尽坐化。` })
    else if (npc.realmIndex > realmBefore && rng.chance(.12)) world.worldEvents.unshift({ id: crypto.randomUUID(), year: world.currentYear, text: `${npc.name}突破旧境，在同代修士中声名渐起。` })
  }
  world.worldEvents = world.worldEvents.slice(0, 100)
  for (const descendant of world.descendants) {
    if (!descendant.alive || descendant.isPlayer) continue
    descendant.ageMonths += months
    if (descendant.ageMonths >= descendant.lifespanMonths) descendant.alive = false
  }
}
