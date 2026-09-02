<script setup lang="ts">
import { useGameStore } from '../stores/game'
const game = useGameStore()
</script>

<template>
  <aside class="logs-panel panel">
    <div class="section-head"><div><span class="eyebrow">山河有记</span><h3>近来纪事</h3></div><RouterLink to="/chronicle">查看全部</RouterLink></div>
    <div v-if="!game.state.logs.length" class="empty compact">此刻风平浪静。</div>
    <ol v-else class="timeline-list">
      <li v-for="log in game.state.logs.slice(0, 8)" :key="log.id" :class="log.type">
        <time>玄历 {{ log.year }}年</time><p>{{ log.text }}</p>
      </li>
    </ol>
  </aside>
</template>
