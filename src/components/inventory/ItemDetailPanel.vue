<script setup lang="ts">
import type { InventoryEntry } from './types'
import type { ItemDefinition, ItemSourceRecord } from '../../models'

withDefaults(defineProps<{
  entry?: InventoryEntry
  favorite?: boolean
  canUse?: boolean
  canEquip?: boolean
  canPrepare?: boolean
  equipped?: boolean
  bound?: boolean
  canBind?: boolean
  fit?: string
  currentItem?: ItemDefinition
  sourceHistory?: ItemSourceRecord[]
  pillToxicity?: number
}>(), { favorite: false, canUse: false, canEquip: false, canPrepare: false, equipped: false, bound: false, canBind: false, fit: '普通', sourceHistory: () => [], pillToxicity: 0 })
defineEmits<{ use: []; equip: []; unequip: []; prepare: []; favorite: []; bind: []; unbind: [] }>()
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
        <div v-if="entry.item.equipmentSlot"><dt>装备槽位</dt><dd>{{ entry.item.equipmentSlot === 'weapon' ? '武器' : entry.item.equipmentSlot === 'armor' ? '防具' : entry.item.equipmentSlot === 'accessory' ? '饰品' : '法宝' }}</dd></div>
        <div v-if="entry.item.preferredPaths?.length"><dt>推荐道途</dt><dd>{{ entry.item.preferredPaths.join(' · ') }}</dd></div>
        <div v-if="entry.item.preferredElements?.length"><dt>推荐灵根</dt><dd>{{ entry.item.preferredElements.join(' · ') }}</dd></div>
        <div v-if="entry.item.equipmentSlot"><dt>你的适配</dt><dd>{{ fit }}</dd></div>
        <div v-if="entry.item.combatPower"><dt>基础战力贡献</dt><dd>+{{ entry.item.combatPower }}</dd></div>
        <div v-if="entry.item.pill"><dt>丹毒</dt><dd>服用 +{{ entry.item.pill.toxicity ?? 0 }} · 当前 {{ Math.round(pillToxicity) }}</dd></div>
        <div v-if="bound"><dt>本命法宝</dt><dd>已绑定</dd></div>
      </dl>
      <div v-if="entry.item.itemEffects?.length" class="item-special-effects"><small>特殊效果</small><span v-for="effect in entry.item.itemEffects" :key="`${effect.type}-${effect.description}`">{{ effect.description }}</span></div>
      <div v-if="currentItem && currentItem.id !== entry.item.id" class="equipment-compare"><small>替换对比</small><p>当前：{{ currentItem.name }} · 战力 +{{ currentItem.combatPower ?? 0 }}</p><p>新装备：{{ entry.item.name }} · 战力 +{{ entry.item.combatPower ?? 0 }}</p></div>
      <details v-if="sourceHistory.length"><summary>查看获得来源</summary><p v-for="source in sourceHistory" :key="`${source.year}-${source.location}`">{{ source.year }}年 · {{ source.location }} · {{ source.source }}<span v-if="source.inheritedFrom"> · 传自{{ source.inheritedFrom }}</span></p></details>
      <div class="item-detail-actions">
        <button v-if="canUse" class="primary" @click="$emit('use')">使用</button>
        <button v-if="canEquip && !equipped" class="primary" @click="$emit('equip')">装备</button>
        <button v-if="equipped" class="button" @click="$emit('unequip')">卸下</button>
        <button v-if="canPrepare" class="button" @click="$emit('prepare')">炼作底牌</button>
        <button v-if="canBind && !bound" class="button" @click="$emit('bind')">设为本命</button>
        <button v-if="bound" class="button danger" @click="$emit('unbind')">取消本命</button>
        <button class="button" :class="{ favorited: favorite }" @click="$emit('favorite')">{{ favorite ? '已收藏' : '收藏' }}</button>
      </div>
      <p class="item-action-note">收藏仅用于本次浏览标记；物品丢弃将在正式物品管理规则开放后提供。</p>
    </div>
    <div v-else class="item-detail-empty"><span>物</span><p>从列表中选择一件物品查看详情。</p></div>
  </aside>
</template>

<style scoped>
.item-special-effects{display:grid;gap:6px;margin:14px 0}.item-special-effects small{color:var(--muted)}.item-special-effects span{padding:7px 9px;border-left:2px solid rgba(211,168,82,.55);background:rgba(200,164,91,.07);font-size:.82rem}.equipment-compare{margin:14px 0;padding:10px;border:1px solid rgba(200,164,91,.24)}.equipment-compare p,details p{margin:6px 0;color:var(--muted);font-size:.8rem}details{margin:12px 0}summary{cursor:pointer;color:#d2ad62}
</style>
