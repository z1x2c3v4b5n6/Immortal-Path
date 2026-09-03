import type { RealmDefinition } from '../models'

export const BASE_LIFESPAN_YEARS: Record<RealmDefinition['group'], number> = {
  凡人: 100,
  炼气: 130,
  筑基: 220,
  金丹: 500,
  元婴: 1000,
  化神: 2000,
  炼虚: 4000,
  合体: 8000,
  大乘: 15000,
  渡劫: 30000,
}
