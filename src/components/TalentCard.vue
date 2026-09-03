<script setup lang="ts">
defineProps<{
  name: string
  description: string
  meta: string
  selected?: boolean
  disabled?: boolean
  locked?: boolean
  disabledReason?: string
}>()

defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="talent-card"
    :class="{ selected, unavailable: disabled && !selected, locked }"
    :disabled="disabled || locked"
    :aria-pressed="selected"
    @click="$emit('toggle')"
  >
    <span v-if="selected" class="talent-selected-mark">✓ 已选择</span>
    <span class="talent-card-meta">{{ meta }}</span>
    <b>{{ locked ? '？？？' : name }}</b>
    <small>{{ description }}</small>
    <em v-if="disabled && !selected" class="talent-disabled-reason">{{ disabledReason || '当前不可选择' }}</em>
  </button>
</template>
