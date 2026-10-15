<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ItemDetailPanel from '../components/inventory/ItemDetailPanel.vue'
import ItemList from '../components/inventory/ItemList.vue'
import type { InventoryEntry } from '../components/inventory/types'
import { itemById } from '../data/items'
import { ItemCategory } from '../models'
import { itemPathFit, isEquipped } from '../core/items/equipment'
import { RECIPES } from '../data/recipes'
import { canCraft } from '../core/items/recipes'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const legacyArtifactItems = ['sword', 'bell', 'seal']
const questItems = ['map', 'token']
const categories = ['全部', '材料', '丹药', '功法', '法宝', '任务', '特殊']
const activeCategory = ref('全部')
const selectedId = ref<string>()
const favorites = ref(new Set<string>())

function categoryFor(id: string, type: string) {
  const item = itemById(id)
  const mapped: Partial<Record<ItemCategory, string>> = { [ItemCategory.MATERIAL]: '材料', [ItemCategory.PILL]: '丹药', [ItemCategory.WEAPON]: '法宝', [ItemCategory.ARMOR]: '法宝', [ItemCategory.ACCESSORY]: '法宝', [ItemCategory.ARTIFACT]: '法宝', [ItemCategory.TECHNIQUE]: '功法', [ItemCategory.QUEST]: '任务', [ItemCategory.SPECIAL]: '特殊' }
  if (item?.category && mapped[item.category]) return mapped[item.category]!
  if (questItems.includes(id)) return '任务'
  if (type === '传承') return '功法'
  if (type === '法器') return '法宝'
  return type
}
function sourceFor(category: string) {
  if (category === '丹药' || category === '材料') return '历练、事件与修行收获'
  if (category === '法宝') return '洞府机缘、战斗与宗门兑换'
  if (category === '功法') return '传承、秘境或高人指点'
  if (category === '任务') return '人物与世界事件'
  return '特殊机缘'
}
function purposeFor(category: string) {
  if (category === '丹药') return '服用后获得修为、寿元或其他效果'
  if (category === '材料') return '用于修炼、突破及后续炼制'
  if (category === '法宝') return '装备后参与斗法，提升战力'
  if (category === '功法') return '承载功法或传承线索'
  if (category === '任务') return '推进相关人物或世界事件'
  return '用途尚待机缘揭晓'
}

const inventory = computed<InventoryEntry[]>(() => (game.player?.inventory ?? []).map((stack) => {
  const item = itemById(stack.itemId)
  if (!item) return undefined
  const category = categoryFor(item.id, item.type)
  return { stack, item, category, source: sourceFor(category), purpose: purposeFor(category) }
}).filter((entry): entry is InventoryEntry => !!entry))
const filteredInventory = computed(() => activeCategory.value === '全部' ? inventory.value : inventory.value.filter((entry) => entry.category === activeCategory.value))
const selected = computed(() => inventory.value.find((entry) => entry.item.id === selectedId.value))
const equipped = computed(() => Boolean(game.player && selected.value && isEquipped(game.player, selected.value.item.id)))
const bound = computed(() => game.player?.boundArtifact?.artifactId === selected.value?.item.id)
const fit = computed(() => game.player && selected.value ? itemPathFit(game.player, selected.value.item).grade : '普通')
const currentItem = computed(() => {
  if (!game.player || !selected.value?.item.equipmentSlot) return undefined
  const slot = selected.value.item.equipmentSlot
  const id = slot === 'artifact' ? game.player.equipment.artifactSlots[0] : game.player.equipment[slot]
  return id ? itemById(id) : undefined
})
const sourceHistory = computed(() => game.player?.itemSourceHistory.filter((entry) => entry.itemId === selected.value?.item.id) ?? [])
const canBindSelected = computed(() => Boolean(selected.value?.item.artifact && game.player && game.player.realmIndex >= 11 && !game.player.boundArtifact))
const pillToxicity = computed(() => game.player?.pillToxicity ?? 0)
const knownRecipes = computed(() => RECIPES.filter((entry) => game.player?.knownRecipes.includes(entry.id)))
const craftable = (recipe: (typeof RECIPES)[number]) => Boolean(game.player && canCraft(game.player, recipe))
const categoryCount = (category: string) => category === '全部' ? inventory.value.length : inventory.value.filter((entry) => entry.category === category).length
watch(filteredInventory, (entries) => {
  if (!entries.some((entry) => entry.item.id === selectedId.value)) selectedId.value = entries[0]?.item.id
}, { immediate: true })
function toggleFavorite() {
  if (!selected.value) return
  const next = new Set(favorites.value)
  if (next.has(selected.value.item.id)) next.delete(selected.value.item.id)
  else next.add(selected.value.item.id)
  favorites.value = next
}
</script>

<template>
  <div class="view-page">
    <header class="page-head inventory-page-head"><div><p class="eyebrow">方寸藏乾坤</p><h1>乾坤袋</h1><p>分类检视此世所得，选中物品后可在右侧查看来源、用途与可用操作。</p></div><div class="inventory-head-count"><strong>{{ inventory.length }}</strong><span>类藏品</span></div></header>
    <section class="inventory-workbench panel">
      <nav class="inventory-categories" aria-label="物品分类">
        <header><small>物品分类</small><b>INVENTORY</b></header>
        <button v-for="category in categories" :key="category" :class="{ active: activeCategory === category }" @click="activeCategory = category"><span>{{ category }}</span><b>{{ categoryCount(category) }}</b></button>
      </nav>
      <div class="inventory-list-pane">
        <div class="inventory-list-head"><div><small>{{ activeCategory }}</small><b>{{ filteredInventory.length }} 类物品</b></div><span>点击查看详情</span></div>
        <ItemList v-if="filteredInventory.length" :entries="filteredInventory" :selected-id="selectedId" :favorites="favorites" @select="selectedId = $event" />
        <div v-else class="inventory-list-empty"><span>空</span><h2>{{ inventory.length ? `暂无${activeCategory}物品` : '袋中尚无一物' }}</h2><p>外出历练，机缘自会到来。</p><RouterLink to="/adventure" class="button">前往历练</RouterLink></div>
      </div>
      <ItemDetailPanel :entry="selected" :favorite="selected ? favorites.has(selected.item.id) : false" :can-use="!!selected && (!!selected.item.effects?.length || !!selected.item.pill?.effects.some(effect => !['BREAKTHROUGH','COMBAT_POWER','PROTECT_HEART'].includes(effect.type)))" :can-equip="!!selected && (!!selected.item.equipmentSlot || legacyArtifactItems.includes(selected.item.id))" :can-prepare="!!selected && (!!selected.item.artifact?.activeEffect || ['qi-burst-pill','heart-protection-pill','qi-pill','spirit-dew'].includes(selected.item.id))" :equipped="equipped" :bound="bound" :can-bind="canBindSelected" :fit="fit" :current-item="currentItem" :source-history="sourceHistory" :pill-toxicity="pillToxicity" @use="selected && game.useItem(selected.item.id)" @equip="selected && game.equipArtifactFromItem(selected.item.id)" @unequip="selected && game.unequipInventoryItem(selected.item.id)" @prepare="selected && game.prepareBattleCardFromItem(selected.item.id)" @bind="selected && game.bindArtifactItem(selected.item.id)" @unbind="game.unbindArtifactItem" @favorite="toggleFavorite" />
    </section>
    <section v-if="knownRecipes.length" class="panel recipe-workbench"><div class="section-head"><div><span class="eyebrow">BASIC REFINING</span><h3>基础炼制</h3><p>直接消耗材料完成炼制，不包含炉温、QTE 或复杂配方研究。</p></div></div><div class="recipe-grid"><article v-for="recipe in knownRecipes" :key="recipe.id"><div><b>{{ recipe.name }}</b><p>{{ recipe.materials.map(material => `${itemById(material.itemId)?.name ?? material.itemId} ×${material.amount}`).join(' · ') }}</p></div><button class="button" :disabled="!craftable(recipe)" @click="game.craftRecipe(recipe.id)">{{ craftable(recipe) ? '确认炼制' : '材料不足' }}</button></article></div></section>
  </div>
</template>

<style scoped>
.recipe-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.recipe-grid article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid rgba(200,164,91,.18)}.recipe-grid p{margin:4px 0 0;color:var(--muted);font-size:.78rem}@media(max-width:750px){.recipe-grid{grid-template-columns:1fr}}
</style>
