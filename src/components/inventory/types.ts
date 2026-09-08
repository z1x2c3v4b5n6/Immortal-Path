import type { InventoryItem, ItemDefinition } from '../../models'

export interface InventoryEntry {
  stack: InventoryItem
  item: ItemDefinition
  category: string
  source: string
  purpose: string
}
