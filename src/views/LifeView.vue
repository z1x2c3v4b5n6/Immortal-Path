<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const paths = computed(() => [...(game.player?.fatePaths ?? [])].sort((a, b) => Number(b.status === 'completed') - Number(a.status === 'completed') || b.progress - a.progress))
const timeline = computed(() => [...(game.player?.lifeTimeline ?? [])].sort((a, b) => b.year - a.year || b.month - a.month))
</script>

<template>
  <div class="view-page life-page">
    <header class="page-head"><div><p class="eyebrow">一念成因，一生为果</p><h1>人生</h1><p>回望此世经历、因果与正在形成的命运。</p></div><div class="calligraphy">命</div></header>
    <div v-if="!game.player" class="empty large-empty"><span>缘</span><h2>尚未入世</h2><p>创建角色后，此处会记录独属于这一世的故事。</p></div>
    <template v-else>
      <section class="panel life-section">
        <div class="section-head"><div><span class="eyebrow">当前命运</span><h3>命运线</h3></div><b>{{ paths.filter((path) => path.status === 'completed').length }} 条已形成</b></div>
        <div class="fate-path-grid">
          <article v-for="path in paths" :key="path.id" class="fate-path-card" :class="{ completed: path.status === 'completed' }">
            <div><span>{{ path.status === 'completed' ? '已形成' : '形成中' }}</span><b>{{ path.name }}</b><em>{{ path.progress }}%</em></div>
            <p>{{ path.description }}</p><div class="fate-progress"><i :style="{ width: `${path.progress}%` }"></i></div>
            <small>{{ path.milestones.join(' · ') || '尚未留下足够深的命运痕迹' }}</small>
          </article>
        </div>
      </section>
      <section class="panel life-section"><div class="section-head"><div><span class="eyebrow">因果在身</span><h3>因果标签</h3></div></div><div v-if="game.player.fateTags.length" class="fate-tag-list"><span v-for="tag in game.player.fateTags" :key="tag.id" :title="tag.description">{{ tag.name }}<small>玄历 {{ tag.createdAt }}</small></span></div><p v-else class="muted">此世尚未结下特殊因果。</p></section>
      <section class="panel life-section"><div class="section-head"><div><span class="eyebrow">险中所得</span><h3>机缘、传承与生死劫</h3></div><b>{{ game.player.majorOpportunities.length }} 场大机缘</b></div><div class="life-ledger-grid"><article><span>重大机缘</span><b>{{ game.player.majorOpportunities.length }}</b><small>{{ game.player.majorOpportunities[0]?.name ?? '尚未遇见' }}</small></article><article><span>危险遭遇</span><b>{{ game.player.dangerRecords.length }}</b><small>{{ game.player.dangerRecords[0]?.survived === false ? '最近一次未能生还' : '因果尚在延续' }}</small></article><article><span>所得传承</span><b>{{ game.player.inheritanceHistory.length }}</b><small>{{ game.player.inheritanceHistory[0]?.name ?? '尚无传承' }}</small></article></div></section>
      <section class="panel life-section"><div class="section-head"><div><span class="eyebrow">载入人物志</span><h3>重要经历</h3></div><b>{{ game.player.importantEvents.length }} 件</b></div><ol class="life-timeline important"><li v-for="entry in [...game.player.importantEvents].reverse()" :key="entry.id"><time>{{ entry.age }}岁</time><div><b>{{ entry.text }}</b><small>玄历 {{ entry.year }} 年 {{ entry.month }} 月 · 重要度 {{ entry.importance }}</small></div></li></ol><p v-if="!game.player.importantEvents.length" class="muted">尚无足以载入人物志的重要经历。</p></section>
      <section class="panel life-section"><div class="section-head"><div><span class="eyebrow">此生所历</span><h3>人生时间线</h3></div><b>{{ timeline.length }} 条</b></div><ol class="life-timeline"><li v-for="entry in timeline" :key="entry.id"><time>{{ entry.age }}岁</time><div><b>{{ entry.text }}</b><small>玄历 {{ entry.year }} 年 {{ entry.month }} 月</small></div></li></ol></section>
    </template>
  </div>
</template>
