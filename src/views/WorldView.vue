<script setup lang="ts">
import { CULTIVATION_PATHS } from '../data/cultivationPaths'
import { eraName, strengthName, WORLD_ERAS, WORLD_STRENGTHS } from '../data/worldTraits'
import { useGameStore } from '../stores/game'
const game = useGameStore()
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">一人有尽，山河无穷</p><h1>{{ game.state.world.continent.name }}</h1><p>玄历 {{ game.state.world.currentYear }} 年 · 世界种子 {{ game.state.world.seed }}</p></div><div class="calligraphy">界</div></header>
    <section class="continent-overview panel">
      <div><small>世界时代</small><strong>{{ eraName(game.state.world.continent.era) }}</strong><p>{{ WORLD_ERAS[game.state.world.continent.era].description }}</p></div>
      <div><small>文明强度</small><strong>{{ strengthName(game.state.world.continent.strengthLevel) }}</strong><p>{{ WORLD_STRENGTHS[game.state.world.continent.strengthLevel].description }}</p></div>
      <div><small>灵气环境</small><strong>×{{ game.state.world.continent.cultivationEnvironment.spiritualQiMultiplier.toFixed(2) }}</strong><p>资源倾向：{{ game.state.world.continent.resourceTendency }}</p></div>
    </section>
    <section class="panel world-traits"><div class="section-head"><div><span class="eyebrow">WORLD TRAITS</span><h3>世界特质</h3></div></div><div class="trait-grid"><article v-for="trait in game.state.world.continent.traits" :key="trait.id"><b>{{ trait.name }}</b><p>{{ trait.description }}</p></article></div></section>
    <section class="panel path-ecology"><div class="section-head"><div><span class="eyebrow">CULTIVATION ECOLOGY</span><h3>修仙生态</h3></div></div><div><article v-for="path in CULTIVATION_PATHS" :key="path.id"><span>{{ path.name }}</span><i><em :style="{ width: `${game.state.world.continent.pathDistribution[path.id]}%` }"></em></i><b>{{ game.state.world.continent.pathDistribution[path.id] }}%</b></article></div></section>
    <div class="family-strip" v-if="game.state.world.families.length"><div v-for="family in game.state.world.families" :key="family.id"><span>{{ family.name }}</span><small>成员 {{ family.memberIds.length }} · 声望 {{ family.reputation }} · 家资 {{ family.wealth }}</small></div></div>
    <div class="world-grid"><section class="panel"><div class="section-head"><div><span class="eyebrow">山门气数</span><h3>修真势力</h3></div></div><div class="sect-list"><div v-for="sect in game.state.world.sects" :key="sect.id"><span class="sect-seal">{{ sect.name.slice(0, 1) }}</span><div><b>{{ sect.name }}</b><small>{{ sect.status }}</small></div><i><em :style="{ width: `${sect.power}%` }"></em></i><strong>{{ sect.power }}</strong></div></div></section>
      <section class="panel"><div class="section-head"><div><span class="eyebrow">天下大事</span><h3>世界纪年</h3></div></div><div v-if="!game.state.world.worldEvents.length" class="empty compact">尚无大事载入史册。</div><ol v-else class="world-history"><li v-for="event in game.state.world.worldEvents" :key="event.id"><time>玄历 {{ event.year }}年</time><p>{{ event.text }}</p></li></ol></section></div>
  </div>
</template>
