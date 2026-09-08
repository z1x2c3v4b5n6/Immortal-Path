<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  eyebrow?: string
  compact?: boolean
}>(), { title: '', eyebrow: '', compact: false })
</script>

<template>
  <section class="section-card panel" :class="{ compact }">
    <header v-if="title || eyebrow || $slots.action" class="section-card-head">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h3 v-if="title">{{ title }}</h3>
      </div>
      <slot name="action" />
    </header>
    <div class="section-card-body"><slot /></div>
  </section>
</template>
