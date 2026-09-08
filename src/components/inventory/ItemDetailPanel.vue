<script setup lang="ts">
import type { InventoryEntry } from './types'

withDefaults(defineProps<{
  entry?: InventoryEntry
  favorite?: boolean
  canUse?: boolean
  canEquip?: boolean
  canPrepare?: boolean
}>(), { favorite: false, canUse: false, canEquip: false, canPrepare: false })
defineEmits<{ use: []; equip: []; prepare: []; favorite: [] }>()
</script>

<template>
  <aside class="item-detail-panel">
    <div v-if="entry">
      <header><span class="item-detail-glyph">{{ entry.item.type.slice(0, 1) }}</span><div><p class="eyebrow">{{ entry.item.quality }} · {{ entry.category }}</p><h2>{{ entry.item.name }}</h2></div></header>
      <div class="item-detail-quantity"><span>持有数量</span><b>× {{ entry.stack.quantity }}</b></div>
      <p class="item-detail-description">{{ entry.item.description }}</p>
      <dl>
        <div><dt>来源</dt><dd>{{ entry.source }}</dd></div>
        <div><dt>用途</dt><dd>{{ entry.purpose }}</dd></div>
        <div><dt>原始类型</dt><dd>{{ entry.item.type }}</dd></div>
      </dl>
      <div class="item-detail-actions">
        <button v-if="canUse" class="primary" @click="$emit('use')">使用</button>
        <button v-if="canEquip" class="primary" @click="$emit('equip')">装备</button>
        <button v-if="canPrepare" class="button" @click="$emit('prepare')">炼作底牌</button>
        <button class="button" :class="{ favorited: favorite }" @click="$emit('favorite')">{{ favorite ? '已收藏' : '收藏' }}</button>
      </div>
      <p class="item-action-note">收藏仅用于本次浏览标记；物品丢弃将在正式物品管理规则开放后提供。</p>
    </div>
    <div v-else class="item-detail-empty"><span>物</span><p>从列表中选择一件物品查看详情。</p></div>
  </aside>
</template>
