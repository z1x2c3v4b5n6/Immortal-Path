import { originById } from '../src/data/origins'
import type { Player } from '../src/models'

export const playerFixture = (): Player => ({
  id: 'p', name: '沈砚', generation: 1, birthYear: 84, ageMonths: 240, lifespanMonths: 1200,
  realmIndex: 1, cultivation: 200, cultivationRequired: 255,
  spiritRoot: { id: 'dual', name: '水木双灵根', rank: 4, multiplier: 1.2, elements: ['水', '木'] },
  stats: { comprehension: 60, luck: 60, constitution: 50, soul: 50, charm: 50 }, spiritStones: 0,
  inventory: [], talents: [], talentPoints: 5, origin: originById('farmer'), familyId: 'family-p',
  bloodline: { familyId: 'family-p', familyName: '沈氏', bloodlineLevel: 1, inheritedTraits: [] }, entryType: 'initial',
  alive: true, achievements: [], timeline: [],
})
