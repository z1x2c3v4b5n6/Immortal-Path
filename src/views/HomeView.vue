<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const name = ref('')
const latestRecord = computed(() => game.state.lifeRecords[0])
</script>

<template>
  <div v-if="!game.player" class="creation page-center">
    <div class="ink-orbit"><span>道</span></div>
    <p class="eyebrow">一卷新章</p><h1>名落长生录，<br><i>此身问仙途。</i></h1>
    <p class="lede">山河不会因一人的逝去而停步。你的每一世，都将成为这个世界留下的旧闻。</p>
    <form @submit.prevent="game.createCharacter(name)"><label>此世名讳</label><div><input v-model="name" maxlength="12" placeholder="留空则由天意择名" /><button class="primary">落笔入世</button></div></form>
    <p v-if="game.state.lifeRecords.length" class="legacy-note">前尘 {{ game.state.lifeRecords.length }} 世 · 可用轮回点 {{ game.state.reincarnation.totalPoints }}</p>
  </div>

  <div v-else-if="!game.player.alive" class="death-summary">
    <div class="death-banner"><span>终</span><div><p class="eyebrow">第 {{ game.player.generation }} 世 · 尘缘已了</p><h1>{{ game.player.name }}</h1><p>{{ game.player.causeOfDeath }}，享年 {{ game.ageYears }} 岁。</p></div></div>
    <div class="summary-grid">
      <div class="metric"><small>最高境界</small><strong>{{ latestRecord?.maxRealm }}</strong></div>
      <div class="metric"><small>本世轮回点</small><strong>+{{ latestRecord?.pointsEarned }}</strong></div>
      <div class="metric"><small>世界仍在</small><strong>玄历 {{ game.state.world.currentYear }} 年</strong></div>
    </div>
    <section class="panel summary-scroll"><div class="section-head"><div><span class="eyebrow">盖棺定论</span><h3>生平纪要</h3></div><RouterLink to="/chronicle">完整生平</RouterLink></div>
      <ol class="life-mini"><li v-for="event in game.player.timeline.slice(-7)" :key="`${event.year}-${event.month}-${event.text}`"><time>{{ event.year }}年</time><span>{{ event.text }}</span></li></ol>
    </section>
    <div class="next-life"><input v-model="name" maxlength="12" placeholder="下一世名讳（可留空）" /><button class="primary" @click="game.beginNextLife(name)">开启第 {{ game.player.generation + 1 }} 世</button><RouterLink to="/reincarnation" class="button ghost">先参悟轮回</RouterLink></div>
  </div>

  <div v-else class="home-view">
    <section class="hero-card panel">
      <div><p class="eyebrow">{{ game.player.origin.name }} · {{ game.player.spiritRoot.name }}</p><h1>洞中无岁月，<br><i>世上已千年。</i></h1><p>{{ game.player.origin.description }} 此世已行至 {{ game.currentRealm.name }}，尚余约 {{ game.remainingYears }} 年天命。</p></div>
      <div class="year-seal"><small>玄历</small><strong>{{ game.state.world.currentYear }}</strong><span>第 {{ game.player.generation }} 世</span></div>
    </section>
    <div class="quick-grid">
      <RouterLink to="/cultivation" class="action-card"><span>炁</span><div><small>闭关吐纳</small><h3>潜心修炼</h3><p>积累修为，叩问下一重境界。</p></div><b>→</b></RouterLink>
      <RouterLink to="/adventure" class="action-card"><span>行</span><div><small>山河游历</small><h3>外出历练</h3><p>寻访奇遇，获取灵石与宝物。</p></div><b>→</b></RouterLink>
    </div>
    <section class="panel world-whisper"><div><p class="eyebrow">天下传闻</p><h3>{{ game.state.world.worldEvents[0]?.text ?? '中州风平浪静，各宗休养生息。' }}</h3></div><RouterLink to="/world">观天下</RouterLink></section>
  </div>
</template>
