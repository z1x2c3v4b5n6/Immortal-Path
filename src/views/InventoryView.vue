<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ItemDetailPanel from '../components/inventory/ItemDetailPanel.vue'
import ItemList from '../components/inventory/ItemList.vue'
import type { InventoryEntry } from '../components/inventory/types'
import { itemById } from '../data/items'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const artifactItems = ['sword', 'bell', 'seal']
const cardItems = ['qi-pill', 'spirit-dew', 'foundation-pill']
const questItems = ['map', 'token']
const categories = ['全部', '材料', '丹药', '功法', '法宝', '任务', '特殊']
const activeCategory = ref('全部')
const selectedId = ref<string>()
const favorites = ref(new Set<string>())

function categoryFor(id: string, type: string) {
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
      <ItemDetailPanel :entry="selected" :favorite="selected ? favorites.has(selected.item.id) : false" :can-use="!!selected?.item.effects?.length" :can-equip="!!selected && artifactItems.includes(selected.item.id)" :can-prepare="!!selected && cardItems.includes(selected.item.id)" @use="selected && game.useItem(selected.item.id)" @equip="selected && game.equipArtifactFromItem(selected.item.id)" @prepare="selected && game.prepareBattleCardFromItem(selected.item.id)" @favorite="toggleFavorite" />
    </section>
  </div>
</template>
