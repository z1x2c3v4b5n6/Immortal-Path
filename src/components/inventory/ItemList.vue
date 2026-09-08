<script setup lang="ts">
import type { InventoryEntry } from './types'

defineProps<{ entries: InventoryEntry[]; selectedId?: string; favorites: Set<string> }>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <div class="inventory-item-list" role="listbox" aria-label="物品列表">
    <button v-for="entry in entries" :key="entry.item.id" :class="{ selected: selectedId === entry.item.id }" :data-quality="entry.item.quality" role="option" :aria-selected="selectedId === entry.item.id" @click="$emit('select', entry.item.id)">
      <span class="inventory-item-glyph">{{ entry.item.type.slice(0, 1) }}</span>
      <span class="inventory-item-copy"><span><b>{{ entry.item.name }}</b><em v-if="favorites.has(entry.item.id)">藏</em></span><small>{{ entry.item.quality }} · {{ entry.category }}</small><p>{{ entry.item.description }}</p></span>
      <strong>×{{ entry.stack.quantity }}</strong>
    </button>
  </div>
</template>
