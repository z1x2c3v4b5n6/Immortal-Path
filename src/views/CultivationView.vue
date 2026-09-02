<script setup lang="ts">
import { computed } from 'vue'
import { canBreakthrough } from '../core/breakthrough/breakthrough'
import { calculateCultivationGain } from '../core/cultivation/cultivation'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const actions = [
  { months: 1, label: '吐纳一月', note: '短修' }, { months: 3, label: '静修三月', note: '小周天' }, { months: 12, label: '修炼一年', note: '周天循环' },
  { months: 36, label: '闭关三年', note: '洞门暂闭' }, { months: 120, label: '闭关十年', note: '岁月无声' },
]
const chance = computed(() => game.breakthroughChance)
const available = computed(() => game.player ? canBreakthrough(game.player) : false)
</script>

<template>
  <div class="view-page" v-if="game.player">
    <header class="page-head"><div><p class="eyebrow">大道无涯</p><h1>修炼</h1><p>吞吐天地灵气，积跬步以至千里。</p></div><div class="calligraphy">炁</div></header>
    <section class="cultivation-focus panel">
      <div class="focus-ring"><span>{{ Math.min(100, Math.floor(game.player.cultivation / game.player.cultivationRequired * 100)) }}<small>%</small></span></div>
      <div><small>当前道行</small><h2>{{ game.currentRealm.name }}</h2><p>修为 {{ Math.floor(game.player.cultivation).toLocaleString() }} / {{ game.player.cultivationRequired.toLocaleString() }}</p>
        <div class="progress large"><i :style="{ width: `${Math.min(100, game.player.cultivation / game.player.cultivationRequired * 100)}%` }"></i></div>
      </div>
    </section>
    <h3 class="block-title">择时修行</h3>
    <div class="duration-grid"><button v-for="action in actions" :key="action.months" :disabled="!game.player.alive || !!game.pendingEvent" @click="game.cultivate(action.months)"><small>{{ action.note }}</small><b>{{ action.label }}</b><span>预计 +{{ calculateCultivationGain(game.player, action.months).toLocaleString() }} 修为</span></button></div>
    <section class="breakthrough panel" :class="{ available }"><div><p class="eyebrow">破境关隘</p><h3>{{ available ? '灵台圆满，可叩天关' : '尚需积蓄修为' }}</h3><p v-if="chance">基础 {{ Math.round(chance.base * 100) }}% · 灵根 {{ chance.spiritRoot >= 0 ? '+' : '' }}{{ Math.round(chance.spiritRoot * 100) }}% · 悟性 {{ chance.comprehension >= 0 ? '+' : '' }}{{ Math.round(chance.comprehension * 100) }}% · 最终成功率 <b>{{ Math.round(chance.final * 100) }}%</b></p></div><button class="primary" :disabled="!available" @click="game.breakthrough">开始突破</button></section>
  </div>
</template>
