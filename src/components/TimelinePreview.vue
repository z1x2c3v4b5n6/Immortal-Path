<script setup lang="ts">
withDefaults(defineProps<{
  entries: Array<{ id: string; time: string; text: string; type?: string; title?: string }>
  emptyText?: string
}>(), { emptyText: '此刻风平浪静。' })
</script>

<template>
  <div v-if="!entries.length" class="context-empty">{{ emptyText }}</div>
  <ol v-else class="timeline-preview">
    <li v-for="entry in entries" :key="entry.id" :data-type="entry.type">
      <time>{{ entry.time }}</time>
      <b v-if="entry.title">{{ entry.title }}</b>
      <p>{{ entry.text }}</p>
    </li>
  </ol>
</template>
