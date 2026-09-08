<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { itemById } from '../data/items'
import { useGameStore } from '../stores/game'
import RecentLogs from './RecentLogs.vue'
import SectionCard from './SectionCard.vue'
import TimelinePreview from './TimelinePreview.vue'

const route = useRoute()
const game = useGameStore()
const collapsed = ref(false)
watch(() => route.path, () => { collapsed.value = false })

const inventoryCount = computed(() => (game.player?.inventory ?? []).reduce((sum, stack) => sum + stack.quantity, 0))
const inventoryKinds = computed(() => game.player?.inventory.length ?? 0)
const lootEntries = computed(() => game.state.logs.filter((log) => log.type === 'loot' || /获得|拾得/.test(log.text)).slice(0, 5).map((log) => ({ id: log.id, time: `玄历 ${log.year}年`, text: log.text, type: 'loot' })))
const cultivationEntries = computed(() => (game.player?.cultivationLogs ?? []).slice(0, 5).map((log) => ({ id: log.id, time: `玄历 ${log.year}年`, title: log.title, text: log.summary, type: log.resultType })))
const worldEntries = computed(() => game.state.world.worldEvents.slice(0, 5).map((event) => ({ id: event.id, time: `玄历 ${event.year}年`, text: event.text, type: 'world' })))
const lifeEntries = computed(() => [...(game.player?.lifeTimeline ?? [])].reverse().slice(0, 5).map((event) => ({ id: event.id, time: `${event.age}岁`, text: event.text, type: event.type })))
const combatEntries = computed(() => (game.player?.combatHistory ?? []).slice(0, 5).map((record) => ({ id: record.id, time: `玄历 ${record.year}年`, title: record.enemyName, text: record.summary, type: record.outcome })))
const socialEntries = computed(() => (game.player?.socialHistory ?? []).slice(0, 5).map((entry) => ({ id: entry.id, time: `玄历 ${entry.year}年`, text: entry.text, type: entry.type })))
const stateLabels: Record<string, string> = { NORMAL: '状态平稳', INJURED: '轻伤', SERIOUS_INJURY: '重伤', INNER_DEMON: '心魔', ENLIGHTENED: '顿悟余韵', BOTTLENECK: '瓶颈' }
const itemTypes = computed(() => {
  const counts = new Map<string, number>()
  for (const stack of game.player?.inventory ?? []) {
    const type = itemById(stack.itemId)?.type ?? '未知'
    counts.set(type, (counts.get(type) ?? 0) + stack.quantity)
  }
  return [...counts.entries()]
})
</script>

<template>
  <aside class="context-panel" :class="{ collapsed }">
    <button class="context-toggle" :title="collapsed ? '展开辅助信息' : '收起辅助信息'" @click="collapsed = !collapsed">{{ collapsed ? '‹' : '›' }}</button>
    <div v-if="!collapsed" class="context-panel-inner">
      <template v-if="route.path === '/inventory'">
        <SectionCard eyebrow="乾坤一览" title="物品统计" compact>
          <div class="context-metrics"><div><b>{{ inventoryKinds }}</b><small>物品种类</small></div><div><b>{{ inventoryCount }}</b><small>物品总数</small></div></div>
          <div class="context-tag-list"><span v-for="entry in itemTypes" :key="entry[0]">{{ entry[0] }} <b>{{ entry[1] }}</b></span></div>
        </SectionCard>
        <SectionCard eyebrow="入袋有声" title="最近获得" compact><TimelinePreview :entries="lootEntries" empty-text="最近没有物品入袋。" /></SectionCard>
      </template>

      <template v-else-if="route.path === '/cultivation'">
        <SectionCard eyebrow="当前状态" title="修行气象" compact>
          <div class="context-tag-list"><span v-for="state in game.player?.characterStates" :key="state">{{ stateLabels[state] ?? state }}</span></div>
          <dl class="context-resource-list"><div><dt>灵药</dt><dd>{{ game.player?.resources.spiritHerbs }}</dd></div><div><dt>妖丹</dt><dd>{{ game.player?.resources.beastCores }}</dd></div><div><dt>炼体材料</dt><dd>{{ game.player?.resources.bodyMaterials }}</dd></div><div><dt>魂晶</dt><dd>{{ game.player?.resources.soulCrystals }}</dd></div></dl>
        </SectionCard>
        <SectionCard eyebrow="行功留痕" title="修炼日志" compact><TimelinePreview :entries="cultivationEntries" empty-text="尚无修炼日志。" /><template #action><RouterLink to="/cultivation">查看页面</RouterLink></template></SectionCard>
      </template>

      <template v-else-if="route.path === '/world'">
        <SectionCard eyebrow="山河脉动" title="世界动态" compact><TimelinePreview :entries="worldEntries" empty-text="天下暂且无事。" /></SectionCard>
        <SectionCard eyebrow="此世天地" title="世界摘要" compact><div class="context-stat-lines"><p><span>宗门</span><b>{{ game.state.world.sects.length }}</b></p><p><span>家族</span><b>{{ game.state.world.families.length }}</b></p><p><span>修士</span><b>{{ game.state.world.npcCultivators.filter(npc => npc.alive).length }}</b></p></div></SectionCard>
      </template>

      <template v-else-if="route.path === '/life'">
        <SectionCard eyebrow="此生回望" title="时间线摘要" compact><TimelinePreview :entries="lifeEntries" empty-text="此生尚待落笔。" /><template #action><RouterLink to="/chronicle">查看全部</RouterLink></template></SectionCard>
        <SectionCard eyebrow="因果在身" title="命运摘要" compact><div class="context-stat-lines"><p><span>因果标签</span><b>{{ game.player?.fateTags.length ?? 0 }}</b></p><p><span>命运线</span><b>{{ game.player?.fatePaths.length ?? 0 }}</b></p><p><span>重要节点</span><b>{{ game.player?.importantEvents.length ?? 0 }}</b></p></div></SectionCard>
      </template>

      <template v-else-if="route.path === '/combat'">
        <SectionCard eyebrow="胜负有痕" title="近期战斗" compact><TimelinePreview :entries="combatEntries" empty-text="尚未留下战斗记录。" /></SectionCard>
      </template>

      <template v-else-if="route.path === '/sect' || route.path === '/relations'">
        <SectionCard eyebrow="人间往来" title="社会动态" compact><TimelinePreview :entries="socialEntries" empty-text="尚无社会往来。" /></SectionCard>
      </template>

      <SectionCard v-else eyebrow="山河有记" title="近来纪事" compact><RecentLogs /></SectionCard>
    </div>
  </aside>
</template>
