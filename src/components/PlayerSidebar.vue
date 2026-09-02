<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const progress = computed(() => Math.min(100, (game.player!.cultivation / game.player!.cultivationRequired) * 100))
const stats = computed<Array<[string, number]>>(() => [
  ['悟性', game.player!.stats.comprehension], ['气运', game.player!.stats.luck], ['体魄', game.player!.stats.constitution],
  ['神识', game.player!.stats.soul], ['魅力', game.player!.stats.charm],
])
</script>

<template>
  <aside class="player-panel panel">
    <div class="eyebrow">今世道途</div>
    <div class="identity"><div class="avatar">{{ game.player!.name.slice(0, 1) }}</div><div><h2>{{ game.player!.name }}</h2><p>{{ game.player!.origin.name }}</p></div></div>
    <div class="realm-badge"><small>当前境界</small><strong>{{ game.currentRealm.name }}</strong></div>
    <div class="progress-block">
      <div><span>修为</span><b>{{ Math.floor(game.player!.cultivation).toLocaleString() }} / {{ game.player!.cultivationRequired.toLocaleString() }}</b></div>
      <div class="progress"><i :style="{ width: `${progress}%` }"></i></div>
    </div>
    <div class="vitals">
      <div><small>年岁</small><strong>{{ game.ageYears }}</strong><span>岁</span></div>
      <div><small>余寿</small><strong>{{ game.remainingYears }}</strong><span>年</span></div>
      <div><small>灵石</small><strong>{{ game.player!.spiritStones }}</strong><span>枚</span></div>
    </div>
    <div class="root-card"><small>灵根</small><b>{{ game.player!.spiritRoot.name }}</b><p>{{ game.player!.spiritRoot.elements.join(' · ') }} · 修炼倍率 {{ game.player!.spiritRoot.multiplier.toFixed(2) }}</p></div>
    <div class="stat-list"><div v-for="stat in stats" :key="stat[0]"><span>{{ stat[0] }}</span><b>{{ stat[1] }}</b><i><em :style="{ width: `${Math.min(100, stat[1])}%` }"></em></i></div></div>
    <div class="talent-tags"><span v-for="talent in game.player!.talents" :key="talent.id" :title="talent.description">{{ talent.name }}</span></div>
  </aside>
</template>
