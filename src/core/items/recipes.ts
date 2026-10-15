import { itemById } from '../../data/items'
import { recipeById } from '../../data/recipes'
import type { Player, Recipe } from '../../models'

export function canCraft(player: Player, recipe: Recipe) {
  const realm = recipe.requirements?.find((entry) => entry.type === 'REALM')
  if (realm && player.realmIndex < Number(realm.value)) return false
  const path = recipe.requirements?.find((entry) => entry.type === 'PATH')
  if (path && player.primaryPath !== path.value) return false
  return recipe.materials.every((material) => (player.inventory.find((entry) => entry.itemId === material.itemId)?.quantity ?? 0) >= material.amount)
}

export function craftItem(player: Player, recipeId: string) {
  const recipe = recipeById(recipeId)
  if (!recipe || !player.knownRecipes.includes(recipeId) || !canCraft(player, recipe)) return false
  for (const material of recipe.materials) player.inventory.find((entry) => entry.itemId === material.itemId)!.quantity -= material.amount
  player.inventory = player.inventory.filter((entry) => entry.quantity > 0)
  const existing = player.inventory.find((entry) => entry.itemId === recipe.resultItemId)
  if (existing) existing.quantity += recipe.resultAmount
  else player.inventory.push({ itemId: recipe.resultItemId, quantity: recipe.resultAmount })
  return Boolean(itemById(recipe.resultItemId))
}
