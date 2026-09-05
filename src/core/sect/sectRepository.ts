import type { Sect, SectType } from '../../models'

export const sectById = (sects: Sect[], id?: string) => id ? sects.find((entry) => entry.id === id) : undefined
export const sectsByType = (sects: Sect[], type: SectType) => sects.filter((entry) => entry.type === type)
export const rankedSects = (sects: Sect[]) => [...sects].sort((a, b) => b.rank - a.rank || b.power - a.power)

