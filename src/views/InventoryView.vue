<script setup lang="ts">
import { computed } from 'vue'
import { itemById } from '../data/items'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const inventory = computed(() => (game.player?.inventory ?? []).map((stack) => ({ stack, item: itemById(stack.itemId)! })).filter((entry) => entry.item))
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">方寸藏乾坤</p><h1>乾坤袋</h1><p>此世所得皆在此处；轮回之后，外物终将散去。</p></div><div class="calligraphy">藏</div></header>
    <div v-if="!inventory.length" class="empty large-empty"><span>空</span><h2>袋中尚无一物</h2><p>外出历练，机缘自会到来。</p><RouterLink to="/adventure" class="button">前往历练</RouterLink></div>
    <div v-else class="inventory-grid"><article v-for="entry in inventory" :key="entry.item.id" class="item-card panel" :data-quality="entry.item.quality"><div class="item-icon">{{ entry.item.type.slice(0, 1) }}</div><div class="item-body"><div><span>{{ entry.item.quality }} · {{ entry.item.type }}</span><b>× {{ entry.stack.quantity }}</b></div><h3>{{ entry.item.name }}</h3><p>{{ entry.item.description }}</p><button v-if="entry.item.effects?.length" class="text-button" @click="game.useItem(entry.item.id)">服用此物</button></div></article></div>
  </div>
</template>
