import type { WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'

const happenings = [
  '青云宗新开山门，广纳门徒。', '血魔宗与天剑门爆发大战。', '北海潮退，露出古修遗迹。', '丹霞谷炼出一炉延寿灵丹。',
  '十万大山兽潮涌动。', '太虚秘境重现于世。', '天剑门老祖坐化，诸峰缟素。', '散修盟在白石城立下分坛。',
  '中州灵脉异动，灵气渐盛。', '血魔宗一夜覆灭，原因不明。', '有元婴修士横渡东海。', '青云宗与丹霞谷结为同盟。',
]

export function createWorld(): WorldState {
  return {
    currentYear: 100, currentMonth: 1, eraName: '玄历', worldEvents: [],
    sects: [
      { id: 'qingyun', name: '青云宗', power: 68, status: '昌盛' },
      { id: 'sword', name: '天剑门', power: 74, status: '鼎盛' },
      { id: 'danxia', name: '丹霞谷', power: 61, status: '安定' },
      { id: 'blood', name: '血魔宗', power: 57, status: '蛰伏' },
    ], npcs: [],
  }
}

export function simulateWorld(world: WorldState, months: number, rng: RandomService) {
  const eventCount = Math.min(8, Math.floor(months / 24) + (rng.chance(Math.min(0.8, months / 24)) ? 1 : 0))
  for (let index = 0; index < eventCount; index++) {
    const yearOffset = months > 12 ? rng.randomInt(0, Math.max(0, Math.floor(months / 12) - 1)) : 0
    world.worldEvents.unshift({ id: crypto.randomUUID(), year: world.currentYear + yearOffset, text: rng.pick(happenings) })
  }
  world.worldEvents = world.worldEvents.slice(0, 100)
  for (const sect of world.sects) {
    sect.power = Math.max(10, Math.min(100, sect.power + rng.randomInt(-2, 3)))
    sect.status = sect.power > 75 ? '鼎盛' : sect.power > 55 ? '昌盛' : sect.power > 35 ? '守成' : '衰微'
  }
}
