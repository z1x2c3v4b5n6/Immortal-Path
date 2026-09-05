import { REALMS } from '../../data/realms'
import { randomSpiritRoot } from '../creation/creation'
import type { CultivationPathId, NPCCultivator, Sect } from '../../models'
import type { RandomService } from '../random/RandomService'
import { SECT_TYPE_PATH, sectPositionForRealm } from '../sect/sect'

const surnames = ['顾', '沈', '林', '谢', '陆', '苏', '楚', '江', '叶', '白', '宁', '裴']
const givenNames = ['青崖', '照雪', '闻道', '清弦', '长庚', '明夷', '归尘', '无咎', '云深', '玄策', '若谷', '星河']
const personalities = ['沉稳', '骄傲', '仁厚', '谨慎', '豪迈', '多疑', '冷峻', '圆融']

export function generateNPCCultivator(rng: RandomService, currentYear: number, sect?: Sect, realmIndex?: number, generation = 1): NPCCultivator {
  void currentYear
  const realm = realmIndex ?? rng.randomInt(1, Math.max(2, (sect?.rank ?? 1) * 6))
  const path: CultivationPathId = sect ? SECT_TYPE_PATH[sect.type] : rng.pick(['dao', 'sword', 'body', 'demonic', 'ghost'] as CultivationPathId[])
  const ageYears = rng.randomInt(16, Math.max(25, REALMS[realm].baseLifespanYears - 5))
  return {
    id: crypto.randomUUID(), name: `${rng.pick(surnames)}${rng.pick(givenNames)}`, ageMonths: ageYears * 12,
    lifespanMonths: REALMS[realm].baseLifespanYears * 12, realmIndex: realm, cultivation: rng.randomInt(0, Math.max(1, REALMS[realm].cultivationRequired - 1)),
    spiritRoot: randomSpiritRoot(rng, sect?.rank ? sect.rank * 2 : 0), path, talents: rng.chance(.22) ? [rng.pick(['早慧', '勤修', '剑骨', '福缘'])] : [],
    personality: rng.pick(personalities), sectId: sect?.id, position: sect ? sectPositionForRealm(realm, rng.randomInt(0, 700)) : undefined,
    alive: true, generation,
  }
}

export function generateSectCohort(rng: RandomService, currentYear: number, sect: Sect, count = rng.randomInt(10, 30)) {
  return Array.from({ length: count }, () => generateNPCCultivator(rng, currentYear, sect, rng.randomInt(1, Math.max(2, sect.rank * 4))))
}

export function simulateNPCCultivator(npc: NPCCultivator, months: number, currentYear: number, rng: RandomService) {
  if (!npc.alive) return npc
  npc.ageMonths += months
  if (npc.ageMonths >= npc.lifespanMonths) { npc.alive = false; npc.deathYear = currentYear; return npc }
  npc.cultivation += Math.round(months * (6 + npc.realmIndex * 2) * npc.spiritRoot.cultivationMultiplier)
  let attempts = 0
  while (npc.realmIndex < REALMS.length - 1 && npc.cultivation >= REALMS[npc.realmIndex].cultivationRequired && attempts++ < 3) {
    if (!rng.chance(Math.max(.12, .88 - npc.realmIndex * .018))) break
    npc.cultivation -= REALMS[npc.realmIndex].cultivationRequired
    npc.realmIndex++
    npc.lifespanMonths = Math.max(npc.lifespanMonths, REALMS[npc.realmIndex].baseLifespanYears * 12)
    npc.position = npc.sectId ? sectPositionForRealm(npc.realmIndex) : undefined
  }
  return npc
}
