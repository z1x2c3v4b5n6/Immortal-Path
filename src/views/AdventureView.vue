<script setup lang="ts">
import { useGameStore } from '../stores/game'
const game = useGameStore()
const regions = [
  { name: '青云山麓', level: '安稳', text: '灵草繁茂，常有散修往来。', mark: '山' },
  { name: '白石荒原', level: '寻常', text: '古战遗痕遍布，偶见残宝。', mark: '原' },
  { name: '雾隐古道', level: '莫测', text: '雾中道路日日不同，奇遇频生。', mark: '雾' },
]
</script>

<template>
  <div class="view-page" v-if="game.player">
    <header class="page-head"><div><p class="eyebrow">读万卷书，行万里路</p><h1>山河历练</h1><p>每次历练耗时三个月，必得一件战利品，并可能触发奇遇。</p></div><div class="calligraphy">游</div></header>
    <div class="region-list"><article v-for="(region, index) in regions" :key="region.name" class="region-card panel" :class="{ locked: index > Math.floor(game.player.realmIndex / 7) }"><div class="region-mark">{{ region.mark }}</div><div><span>{{ region.level }}</span><h2>{{ region.name }}</h2><p>{{ region.text }}</p></div><button class="button" :disabled="index > Math.floor(game.player.realmIndex / 7) || !!game.pendingEvent || !!game.pendingLifeEvent" @click="game.adventure">启程</button></article></div>
    <section class="panel pity-card"><div><p class="eyebrow">天道酬勤</p><h3>机缘保底</h3></div><div><span>未见稀有 <b>{{ game.state.pity.rollsWithoutRare }}</b> 次</span><span>未见极品 <b>{{ game.state.pity.rollsWithoutEpic }}</b> 次</span></div><p>连续十次未见稀有，稀有权重提升；三十次未见极品，下次至少极品。</p></section>
  </div>
</template>
