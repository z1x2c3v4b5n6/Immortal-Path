<script setup lang="ts">
import { computed } from 'vue'
import type { EventOption } from '../models'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const event = computed(() => game.pendingEvent!)
function allowed(option: EventOption) {
  if (!option.requirement || !game.player) return true
  if (option.requirement.realmIndex !== undefined && game.player.realmIndex < option.requirement.realmIndex) return false
  if (option.requirement.stat && option.requirement.min !== undefined && game.player.stats[option.requirement.stat] < option.requirement.min) return false
  return true
}
</script>

<template>
  <div class="modal-backdrop">
    <section class="event-modal">
      <div class="event-glyph">遇</div><p class="eyebrow">途中奇遇</p><h2>{{ event.title }}</h2><p class="event-copy">{{ event.description }}</p>
      <div class="event-options">
        <button v-for="(option, index) in event.options" :key="option.id" :disabled="!allowed(option)" @click="game.chooseEvent(option.id)">
          <span>{{ ['甲', '乙', '丙'][index] }}</span><b>{{ option.label }}</b><small>{{ option.effects.map(effect => effect.text).join(' ') }}</small>
        </button>
      </div>
    </section>
  </div>
</template>
