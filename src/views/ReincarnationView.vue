<script setup lang="ts">
import { UPGRADE_CONFIG, upgradeCost, type UpgradeKey } from '../core/reincarnation/reincarnation'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const keys = Object.keys(UPGRADE_CONFIG) as UpgradeKey[]
const descriptions: Record<UpgradeKey, string> = {
  comprehensionBonus: '每级令后世悟性 +2', luckBonus: '每级令后世气运 +2', constitutionBonus: '每级令后世体魄 +2', spiritRootLuck: '提高优质灵根的生成权重',
}
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">万般带不走，唯有道果随身</p><h1>轮回</h1><p>永久加成存在上限且成本递增，越往后收益越需慎重取舍。</p></div><div class="points-orb"><strong>{{ game.state.reincarnation.totalPoints }}</strong><small>轮回点</small></div></header>
    <div v-if="game.player?.alive" class="notice">今世尚在人间。你可以查看轮回道果，但只能在身后参悟。</div>
    <div class="upgrade-grid"><article v-for="key in keys" :key="key" class="upgrade-card panel"><div class="upgrade-symbol">{{ UPGRADE_CONFIG[key].name.slice(0, 1) }}</div><div><span>永久道果</span><h2>{{ UPGRADE_CONFIG[key].name }}</h2><p>{{ descriptions[key] }}</p><div class="levels"><i v-for="level in UPGRADE_CONFIG[key].max" :key="level" :class="{ filled: level <= game.state.reincarnation.upgrades[key] }"></i></div><small>当前 {{ game.state.reincarnation.upgrades[key] }} / {{ UPGRADE_CONFIG[key].max }} 级</small></div><button class="button" :disabled="!!game.player?.alive || game.state.reincarnation.upgrades[key] >= UPGRADE_CONFIG[key].max || game.state.reincarnation.totalPoints < upgradeCost(key, game.state.reincarnation.upgrades[key])" @click="game.buyUpgrade(key)">参悟 · {{ upgradeCost(key, game.state.reincarnation.upgrades[key]) }} 点</button></article></div>
  </div>
</template>
