<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import TimelinePreview from './TimelinePreview.vue'

type FilterId = 'all' | 'breakthrough' | 'combat' | 'loot' | 'social' | 'life'
const game = useGameStore()
const active = ref<FilterId>('all')
const showAll = ref(false)
const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: '全部' }, { id: 'breakthrough', label: '突破' }, { id: 'combat', label: '战斗' },
  { id: 'loot', label: '物品' }, { id: 'social', label: '社会' }, { id: 'life', label: '人生' },
]

function category(text: string, type: string): Exclude<FilterId, 'all'> {
  if (type === 'realm' || /突破|破境|筑基|结丹|元婴/.test(text)) return 'breakthrough'
  if (/斗法|战斗|战胜|战败|击杀|战死|强敌|妖兽/.test(text)) return 'combat'
  if (type === 'loot' || /获得|拾得|宝物|丹药|法器/.test(text)) return 'loot'
  if (/宗门|家族|师父|同门|道友|仇敌|势力/.test(text)) return 'social'
  return 'life'
}

const filtered = computed(() => game.state.logs.filter((log) => active.value === 'all' || category(log.text, log.type) === active.value))
const entries = computed(() => filtered.value.slice(0, showAll.value ? 30 : 5).map((log) => ({
  id: log.id, time: `玄历 ${log.year}年`, text: log.text, type: category(log.text, log.type),
})))
</script>

<template>
  <div class="recent-logs">
    <div class="log-filters" aria-label="纪事类型筛选">
      <button v-for="filter in filters" :key="filter.id" :class="{ active: active === filter.id }" @click="active = filter.id; showAll = false">{{ filter.label }}</button>
    </div>
    <TimelinePreview :entries="entries" empty-text="此类纪事尚未发生。" />
    <button v-if="filtered.length > 5" class="context-more" @click="showAll = !showAll">{{ showAll ? '收起纪事' : `查看全部（${filtered.length}）` }}</button>
    <RouterLink v-else class="context-more" to="/chronicle">前往长生录</RouterLink>
  </div>
</template>
