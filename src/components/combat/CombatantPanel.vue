<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  side: 'player' | 'enemy'
  label: string
  name: string
  realm: string
  power: number
  health: number
  healthMax: number
  visualClass: string
  subtitle: string
  active?: boolean
  hit?: boolean
  heavy?: boolean
}>(), { active: false, hit: false, heavy: false })
const healthPercent = computed(() => Math.max(0, Math.min(100, props.health / Math.max(1, props.healthMax) * 100)))
</script>

<template>
  <article class="combatant-panel" :class="[side, visualClass, { active, hit, heavy }]">
    <div class="combatant-visual" aria-hidden="true">
      <span class="combatant-aura"></span><span class="combatant-figure">{{ name.slice(0, 1) }}</span><i v-for="index in 6" :key="index"></i>
    </div>
    <div class="combatant-name"><small>{{ label }}</small><h3>{{ name }}</h3><p>{{ realm }} · {{ subtitle }}</p></div>
    <div class="battle-hp"><span><small>战斗状态</small><b>{{ Math.max(0, Math.round(health)) }} / {{ Math.round(healthMax) }}</b></span><i><em :style="{ width: `${healthPercent}%` }"></em></i></div>
    <div class="combatant-power"><small>战斗力</small><strong>{{ power.toLocaleString() }}</strong></div>
    <span v-if="hit" class="damage-float">受创</span>
  </article>
</template>
