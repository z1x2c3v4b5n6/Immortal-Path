import { originById } from '../src/data/origins'
import { createSpiritRoot } from '../src/data/spiritRoots'
import type { Player } from '../src/models'

export const playerFixture = (): Player => ({
  id: 'p', name: '沈砚', generation: 1, birthYear: 84, ageMonths: 240, lifespanMonths: 1200,
  realmIndex: 1, cultivation: 200, cultivationRequired: 255,
  spiritRoot: createSpiritRoot(['水', '木']),
  stats: { comprehension: 60, luck: 60, constitution: 50, soul: 50, charm: 50 },
  statPotential: { comprehension: 78, luck: 82, constitution: 86, soul: 76, charm: 78 }, statHistory: [], spiritStones: 0,
  inventory: [], talents: [], talentPoints: 5, origin: originById('farmer'), familyId: 'family-p',
  bloodline: { familyId: 'family-p', familyName: '沈氏', bloodlineLevel: 1, inheritedTraits: [] }, entryType: 'initial',
  alive: true, achievements: [], timeline: [],
})
