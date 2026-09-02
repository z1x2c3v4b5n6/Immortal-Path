<script setup lang="ts">
import { useGameStore } from '../stores/game'
const game = useGameStore()
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">一人有尽，山河无穷</p><h1>天下</h1><p>玄历 {{ game.state.world.currentYear }} 年 · {{ game.state.world.eraName }}纪元</p></div><div class="calligraphy">界</div></header>
    <div class="world-grid"><section class="panel"><div class="section-head"><div><span class="eyebrow">山门气数</span><h3>修真势力</h3></div></div><div class="sect-list"><div v-for="sect in game.state.world.sects" :key="sect.id"><span class="sect-seal">{{ sect.name.slice(0, 1) }}</span><div><b>{{ sect.name }}</b><small>{{ sect.status }}</small></div><i><em :style="{ width: `${sect.power}%` }"></em></i><strong>{{ sect.power }}</strong></div></div></section>
      <section class="panel"><div class="section-head"><div><span class="eyebrow">天下大事</span><h3>世界纪年</h3></div></div><div v-if="!game.state.world.worldEvents.length" class="empty compact">尚无大事载入史册。</div><ol v-else class="world-history"><li v-for="event in game.state.world.worldEvents" :key="event.id"><time>玄历 {{ event.year }}年</time><p>{{ event.text }}</p></li></ol></section></div>
  </div>
</template>
