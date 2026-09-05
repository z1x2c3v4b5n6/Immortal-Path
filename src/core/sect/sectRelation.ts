import type { Sect, SectRelation, SectRelationType } from '../../models'

const orthodox = new Set(['剑宗', '丹宗', '器宗', '佛门', '体宗'])

export function initialSectRelations(sects: Sect[], year: number): SectRelation[] {
  const result: SectRelation[] = []
  for (let left = 0; left < sects.length; left++) for (let right = left + 1; right < sects.length; right++) {
    const a = sects[left]; const b = sects[right]
    const hostile = (orthodox.has(a.type) && ['魔宗', '鬼宗'].includes(b.type)) || (orthodox.has(b.type) && ['魔宗', '鬼宗'].includes(a.type))
    const ally = a.type === b.type || (['丹宗', '器宗'].includes(a.type) && orthodox.has(b.type)) || (['丹宗', '器宗'].includes(b.type) && orthodox.has(a.type))
    const type: SectRelationType = hostile ? '敌对' : ally ? '盟友' : '中立'
    result.push({ id: `${a.id}:${b.id}`, fromSectId: a.id, toSectId: b.id, type, value: hostile ? -70 : ally ? 45 : 0, updatedYear: year })
  }
  return result
}

export function relationBetween(relations: SectRelation[], firstId: string, secondId: string) {
  return relations.find((entry) => (entry.fromSectId === firstId && entry.toSectId === secondId) || (entry.fromSectId === secondId && entry.toSectId === firstId))
}

export function changeSectRelation(relation: SectRelation, delta: number, year: number) {
  relation.value = Math.max(-100, Math.min(100, relation.value + delta))
  relation.type = relation.value <= -35 ? '敌对' : relation.value >= 35 ? '盟友' : '中立'
  relation.updatedYear = year
  return relation
}

