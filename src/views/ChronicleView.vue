<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const expanded = ref<number | null>(game.state.lifeRecords[0]?.generation ?? null)
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">生如逆旅，代代有痕</p><h1>长生录</h1><p>已历 {{ game.state.lifeRecords.length }} 世，当前世界已行至玄历 {{ game.state.world.currentYear }} 年。</p></div><div class="calligraphy">录</div></header>
    <section v-if="game.player?.alive" class="current-life panel"><span>在世</span><div><small>第 {{ game.player.generation }} 世</small><h2>{{ game.player.name }}</h2><p>{{ game.player.origin.name }} · {{ game.currentRealm.name }} · {{ game.ageYears }}岁</p></div></section>
    <div v-if="!game.state.lifeRecords.length" class="empty large-empty"><span>卷</span><h2>史页尚新</h2><p>当第一世尘缘落定，生平将记入此卷。</p></div>
    <div v-else class="record-list"><article v-for="record in game.state.lifeRecords" :key="record.generation" class="record panel"><button class="record-head" @click="expanded = expanded === record.generation ? null : record.generation"><span class="generation">{{ record.generation }}</span><div><small>第 {{ record.generation }} 世 · {{ record.birthYear }}—{{ record.deathYear }}</small><h2>{{ record.playerName }}</h2><p>{{ record.maxRealm }} · 享年 {{ record.lifespan }} 岁 · {{ record.causeOfDeath }}</p></div><b>{{ expanded === record.generation ? '收' : '展' }}</b></button><div v-if="expanded === record.generation" class="record-body"><div class="achievement-row"><span v-if="!record.achievements.length">平生无碑，亦曾问道。</span><span v-for="achievement in record.achievements" :key="achievement">{{ achievement }}</span></div><ol><li v-for="event in record.timeline" :key="`${event.year}-${event.month}-${event.text}`"><time>{{ event.year }}年{{ event.month }}月</time><p>{{ event.text }}</p></li></ol></div></article></div>
  </div>
</template>
