<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import CharacterCreation from '../components/CharacterCreation.vue'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const router = useRouter()
const latestRecord = computed(() => game.state.lifeRecords[0])
function enterHall() { game.enterReincarnationHall(); void router.push('/reincarnation') }
</script>

<template>
  <CharacterCreation v-if="!game.player" />

  <div v-else-if="!game.player.alive" class="death-summary">
    <div class="death-banner"><span>终</span><div><p class="eyebrow">第 {{ game.player.generation }} 世 · 此世已终</p><h1>{{ game.player.name }}</h1><p>{{ game.player.causeOfDeath }}，享年 {{ game.ageYears }} 岁。</p></div></div>
    <div class="summary-grid"><div class="metric"><small>最高境界</small><strong>{{ latestRecord?.maxRealm }}</strong></div><div class="metric"><small>本世轮回点</small><strong>+{{ latestRecord?.pointsEarned }}</strong></div><div class="metric"><small>世界仍在</small><strong>玄历 {{ game.state.world.currentYear }} 年</strong></div></div>
    <section class="panel summary-scroll"><div class="section-head"><div><span class="eyebrow">盖棺定论</span><h3>生平纪要</h3></div><RouterLink to="/chronicle">完整生平</RouterLink></div><ol class="life-mini"><li v-for="event in game.player.timeline.slice(-7)" :key="`${event.year}-${event.month}-${event.text}`"><time>{{ event.year }}年</time><span>{{ event.text }}</span></li></ol></section>
    <h2 class="path-title">请选择下一段人生</h2>
    <div class="afterlife-grid">
      <section v-if="game.canBecomeGhost" class="afterlife-card panel"><span class="path-glyph">鬼</span><div><p class="eyebrow">LINGERING SOUL</p><h2>魂魄不散</h2><p>拒绝轮回，以残魂转修鬼道。往后不受肉身寿元限制，但魂体稳定归零便会真正消散。</p><small>初始魂体稳定：80%</small></div><button class="primary" @click="game.becomeGhost">转修鬼道</button></section>
      <section class="afterlife-card panel" :class="{ unavailable: !game.eligibleDescendants.length }"><span class="path-glyph">脉</span><div><p class="eyebrow">BLOODLINE</p><h2>血脉延续</h2><p>接管自己的后代，继续家族、财富与未尽因果。</p><small>当前可选择后代：{{ game.eligibleDescendants.length }}</small></div><div v-if="game.eligibleDescendants.length" class="descendant-options"><button v-for="child in game.eligibleDescendants" :key="child.id" @click="game.continueAsDescendant(child.id)"><b>{{ child.name }}</b><span>{{ Math.floor(child.ageMonths / 12) }}岁 · {{ child.spiritRoot.name }}</span></button></div><p v-else class="path-disabled">今世没有已成年且存活的后代。</p></section>
      <section class="afterlife-card panel"><span class="path-glyph">轮</span><div><p class="eyebrow">REINCARNATION</p><h2>轮回转世</h2><p>放弃当前身份，在轮回殿购买选择命运的权限。</p><small>可用轮回点：{{ game.state.reincarnation.totalPoints }}</small></div><button class="primary" @click="enterHall">进入轮回殿</button></section>
    </div>
  </div>

  <div v-else class="home-view">
    <section class="hero-card panel"><div><p class="eyebrow">{{ game.player.origin.name }} · {{ game.player.spiritRoot.name }}</p><h1>洞中无岁月，<br><i>世上已千年。</i></h1><p>{{ game.player.origin.description }} 此世已行至 {{ game.currentRealm.name }}，{{ game.player.primaryPath === 'ghost' ? `魂体稳定约 ${Math.round(game.player.soulStability ?? 0)}%` : `${game.agingStatus}，尚余约 ${game.remainingYears} 年天命` }}。</p></div><div class="year-seal"><small>玄历</small><strong>{{ game.state.world.currentYear }}</strong><span>第 {{ game.player.generation }} 世</span></div></section>
    <div class="quick-grid"><RouterLink to="/cultivation" class="action-card"><span>炁</span><div><small>闭关吐纳</small><h3>潜心修炼</h3><p>积累修为，叩问下一重境界。</p></div><b>→</b></RouterLink><RouterLink to="/adventure" class="action-card"><span>行</span><div><small>山河游历</small><h3>外出历练</h3><p>寻访奇遇，获取灵石与宝物。</p></div><b>→</b></RouterLink></div>
    <section class="panel world-whisper"><div><p class="eyebrow">天下传闻</p><h3>{{ game.state.world.worldEvents[0]?.text ?? '中州风平浪静，各宗休养生息。' }}</h3></div><RouterLink to="/world">观天下</RouterLink></section>
  </div>
</template>
