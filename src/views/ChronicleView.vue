<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { pathById } from '../data/cultivationPaths'

const game = useGameStore()
const expanded = ref<number | null>(game.state.lifeRecords[0]?.generation ?? null)
</script>

<template>
  <div class="view-page">
    <header class="page-head"><div><p class="eyebrow">生如逆旅，代代有痕</p><h1>长生录</h1><p>已历 {{ game.state.lifeRecords.length }} 世，重要人生节点将随人物志永久保留。</p></div><div class="calligraphy">录</div></header>
    <section v-if="game.player?.alive" class="current-life panel"><span>在世</span><div><small>第 {{ game.player.generation }} 世 · {{ game.player.entryType === 'initial' ? '初入人间' : game.player.entryType === 'bloodline' ? '血脉延续' : '轮回转世' }}</small><h2>{{ game.player.name }}</h2><p>{{ game.player.origin.name }} · {{ game.currentRealm.name }} · {{ game.ageYears }}岁 · 主道 {{ pathById(game.player.primaryPath)?.name ?? '未定' }} · {{ game.currentSect ? `${game.currentSect.name}${game.player.sectMembership ? ` ${game.player.sectMembership.position}` : ''}` : '一介散修' }}</p></div></section>
    <div v-if="!game.state.lifeRecords.length" class="empty large-empty"><span>卷</span><h2>史页尚新</h2><p>当第一世尘缘落定，完整死亡总结与人生时间线将记入此卷。</p></div>
    <div v-else class="record-list">
      <article v-for="record in game.state.lifeRecords" :key="record.playerId" class="record panel">
        <button class="record-head" @click="expanded = expanded === record.generation ? null : record.generation"><span class="generation">{{ record.generation }}</span><div><small>第 {{ record.generation }} 世 · {{ record.birthYear }}—{{ record.deathYear }}</small><h2>{{ record.playerName }}</h2><p>{{ record.maxRealm }} · {{ pathById(record.primaryPath)?.name ?? '未定道途' }} · 享年 {{ record.lifespan }} 岁 · {{ record.causeOfDeath }}</p></div><b>{{ expanded === record.generation ? '收' : '展' }}</b></button>
        <div v-if="expanded === record.generation" class="record-body">
          <section class="death-summary"><p class="eyebrow">本世评价</p><h3>{{ record.evaluationTitle }} · {{ record.evaluationScore }}</h3><div class="achievement-row"><span v-for="path in record.fatePaths.filter((entry) => entry.status === 'completed')" :key="path.id">{{ path.name }} +{{ path.evaluation }}</span><span v-for="talent in record.acquiredTalents" :key="talent.talentId">后天 · {{ talent.name }}</span><span v-for="achievement in record.achievements" :key="achievement">{{ achievement }}</span></div></section>
          <section class="chronicle-social"><span>{{ record.sectMembership ? `${record.sectMembership.position} · 贡献 ${record.sectMembership.contribution}` : '此生散修' }}</span><span>好友 {{ record.relationshipSummary.friends }}</span><span>竞争者 {{ record.relationshipSummary.rivals }}</span><span>仇敌 {{ record.relationshipSummary.enemies }}</span><span>弟子 {{ record.relationshipSummary.disciples }}</span></section>
          <ol class="life-timeline important"><li v-for="event in [...record.importantEvents].reverse()" :key="event.id"><time>{{ event.age }}岁</time><div><b>{{ event.text }}</b><small>玄历 {{ event.year }} 年 {{ event.month }} 月</small></div></li></ol>
          <p v-if="!record.importantEvents.length" class="muted">旧版人物志未记录重要节点，可在下方查看原有行迹。</p>
          <ol v-if="!record.importantEvents.length"><li v-for="event in record.timeline" :key="`${event.year}-${event.month}-${event.text}`"><time>{{ event.year }}年{{ event.month }}月</time><p>{{ event.text }}</p></li></ol>
        </div>
      </article>
    </div>
  </div>
</template>
