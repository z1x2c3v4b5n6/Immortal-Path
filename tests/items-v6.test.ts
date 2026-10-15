import { describe, expect, it } from 'vitest'
import { artifactBattleCard, bindArtifact, emptyEquipment, equipItem, equipmentCombatContribution, nourishBoundArtifact, unequipItem } from '../src/core/items/equipment'
import { craftItem } from '../src/core/items/recipes'
import { playerFixture } from './fixtures'

describe('V6 items', () => {
  it('equips, replaces and unequips gear with combat contribution', () => {
    const player = playerFixture({ inventory: [{ itemId: 'green-edge-weapon', quantity: 1 }, { itemId: 'beast-bone-armor', quantity: 1 }], equipment: emptyEquipment() })
    expect(equipItem(player, 'green-edge-weapon').ok).toBe(true)
    expect(equipmentCombatContribution(player)).toBeGreaterThan(0)
    expect(equipItem(player, 'beast-bone-armor').ok).toBe(true)
    expect(unequipItem(player, 'green-edge-weapon')).toBe(true)
  })
  it('requires known recipes and consumes correct materials', () => {
    const player = playerFixture({ inventory: [{ itemId: 'green-spirit-herb', quantity: 3 }], knownRecipes: [] })
    expect(craftItem(player, 'make-qi-pill')).toBe(false)
    player.knownRecipes.push('make-qi-pill')
    expect(craftItem(player, 'make-qi-pill')).toBe(true)
    expect(player.inventory.find((entry) => entry.itemId === 'qi-pill')?.quantity).toBe(1)
  })
  it('binds and nourishes a one-per-life artifact with active combat data', () => {
    const player = playerFixture({ realmIndex: 11, inventory: [{ itemId: 'soul-calming-bell', quantity: 1 }], equipment: emptyEquipment() })
    expect(bindArtifact(player, 'soul-calming-bell', 100)).toBe(true)
    expect(bindArtifact(player, 'soul-calming-bell', 100)).toBe(false)
    nourishBoundArtifact(player, 120, 30)
    expect(player.boundArtifact!.legacyLevel).toBeGreaterThan(0)
    expect(artifactBattleCard(player, 'soul-calming-bell')?.type).toBe('artifact')
  })
})
