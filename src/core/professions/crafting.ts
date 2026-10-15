import { recipeById } from '../../data/recipes'
import type { CraftingResult, Player, Recipe, RecipeMaterial } from '../../models'
import type { RandomService } from '../random/RandomService'
import { addProfessionExperience, profession } from './professions'

export function craftingChance(player: Player, recipe: Recipe, sectType?: string) {
  const progress = profession(player, recipe.profession)
  const sectBonus = (recipe.profession === 'ALCHEMY' && sectType === '丹宗') || (recipe.profession === 'REFINING' && sectType === '器宗') ? .08 : 0
  const chance = .32 + progress.level * .005 + player.stats.comprehension * .002 + player.stats.soul * .0015 + player.realmIndex * .008 + sectBonus - recipe.difficulty * .006
  return Math.max(.05, Math.min(.98, Number(chance.toFixed(3))))
}

export function canAttemptCraft(player: Player, recipe: Recipe) {
  if (!player.knownRecipes.includes(recipe.id)) return { ok: false, reason: '尚未掌握此配方' }
  if (recipe.minimumProfessionLevel && profession(player, recipe.profession).level < recipe.minimumProfessionLevel) return { ok: false, reason: '百业熟练度不足' }
  if (!recipe.materials.every((material) => (player.inventory.find((entry) => entry.itemId === material.itemId)?.quantity ?? 0) >= material.amount)) return { ok: false, reason: '材料不足' }
  return { ok: true, reason: '' }
}

function consume(player: Player, materials: RecipeMaterial[], ratio: number) {
  const consumed = materials.map((entry) => ({ itemId: entry.itemId, amount: Math.min(entry.amount, Math.max(1, Math.ceil(entry.amount * ratio))) }))
  for (const material of consumed) player.inventory.find((entry) => entry.itemId === material.itemId)!.quantity -= material.amount
  player.inventory = player.inventory.filter((entry) => entry.quantity > 0)
  return consumed
}

export function resolveCraft(player: Player, recipeId: string, rng: RandomService, sectType?: string): CraftingResult {
  const recipe = recipeById(recipeId)
  if (!recipe) return { success: false, resultItemId: '', resultAmount: 0, qualityText: '无', experienceGain: 0, materialsConsumed: [], message: '配方不存在。' }
  const allowed = canAttemptCraft(player, recipe)
  if (!allowed.ok) return { success: false, resultItemId: recipe.resultItemId, resultAmount: 0, qualityText: '无', experienceGain: 0, materialsConsumed: [], message: allowed.reason }
  const chance = craftingChance(player, recipe, sectType)
  const roll = rng.random()
  if (roll < chance) {
    const excellence = roll < chance * .12 ? 3 : roll < chance * .38 ? 2 : 1
    const saved = profession(player, recipe.profession).level >= 60 && rng.chance(.12) ? .75 : 1
    const materialsConsumed = consume(player, recipe.materials, saved)
    const amount = recipe.resultAmount * excellence
    const stack = player.inventory.find((entry) => entry.itemId === recipe.resultItemId)
    if (stack) stack.quantity += amount; else player.inventory.push({ itemId: recipe.resultItemId, quantity: amount })
    const experienceGain = recipe.experience + excellence * 2
    addProfessionExperience(player, recipe.profession, experienceGain, true)
    return { success: true, resultItemId: recipe.resultItemId, resultAmount: amount, qualityText: excellence === 3 ? '完美炼制' : excellence === 2 ? '优秀成功' : '普通成功', experienceGain, materialsConsumed, message: `炼制成功，获得 ${amount} 件成品。` }
  }
  const severity = roll > .96 ? 1 : roll > chance + .35 ? .75 : .45
  const materialsConsumed = consume(player, recipe.materials, severity)
  const byproduct = rng.chance(.18) ? 'herb' : undefined
  if (byproduct) { const stack = player.inventory.find((entry) => entry.itemId === byproduct); if (stack) stack.quantity++; else player.inventory.push({ itemId: byproduct, quantity: 1 }) }
  const experienceGain = Math.max(1, Math.floor(recipe.experience * .35))
  addProfessionExperience(player, recipe.profession, experienceGain, false)
  return { success: false, resultItemId: recipe.resultItemId, resultAmount: 0, qualityText: severity >= 1 ? '严重失败' : severity >= .7 ? '普通失败' : '轻微失败', experienceGain, materialsConsumed, byproductItemId: byproduct, message: byproduct ? '炼制失败，但从炉底收得一份药渣。' : '炼制失败，损失了部分材料。' }
}
