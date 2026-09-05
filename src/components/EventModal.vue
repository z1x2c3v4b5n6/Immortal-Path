<script setup lang="ts">
import { computed } from 'vue'
import type { EventOption } from '../models'
import { useGameStore } from '../stores/game'
import { riskLevelName, riskStars } from '../core/lifeEvents/eventRisk'
import { REALMS } from '../data/realms'

const game = useGameStore()
const event = computed(() => game.pendingEvent)
const lifeEvent = computed(() => game.pendingLifeEvent)
const showingResult = computed(() => Boolean(game.ready.eventResultText))

function allowed(option: EventOption) {
  if (!option.requirement || !game.player) return true
  if (option.requirement.realmIndex !== undefined && game.player.realmIndex < option.requirement.realmIndex) return false
  if (option.requirement.stat && option.requirement.min !== undefined && game.player.stats[option.requirement.stat] < option.requirement.min) return false
  return true
}
</script>

<template>
  <div class="modal-backdrop">
    <section class="event-modal" :class="{ 'high-risk-event': lifeEvent && lifeEvent.riskLevel >= 3 }">
      <template v-if="showingResult">
        <div class="event-glyph">果</div><p class="eyebrow">因果已定</p><h2>{{ game.ready.eventResultTitle }}</h2><p class="event-copy">{{ game.ready.eventResultText }}</p>
        <button class="button" @click="game.closeEventResult">收下此念</button>
      </template>
      <template v-else-if="lifeEvent">
        <div class="event-glyph">命</div><p class="eyebrow">人生抉择 · 重要度 {{ lifeEvent.importance }}</p><h2>{{ lifeEvent.name }}</h2><p class="event-copy">{{ lifeEvent.description }}</p>
        <div class="risk-warning" :class="`risk-${lifeEvent.riskLevel}`"><b>危险等级：{{ riskStars(lifeEvent.riskLevel) }} · {{ riskLevelName(lifeEvent.riskLevel) }}</b><span>可能奖励：未知</span><small v-if="lifeEvent.recommendedRealmIndex !== undefined">建议 {{ REALMS[lifeEvent.recommendedRealmIndex]?.name ?? '更高境界' }} 以上修士介入。最终选择权在你。</small><small v-else-if="lifeEvent.riskLevel >= 3">此事可能重伤甚至致命，请谨慎选择。</small></div>
        <div class="event-options">
          <button v-for="(choice, index) in lifeEvent.choices" :key="choice.id" @click="game.chooseLifeEvent(choice.id)">
            <span>{{ ['壹', '贰', '叁'][index] }}</span><b>{{ choice.label }}</b><small>{{ choice.description || '此念既出，因果自生' }}</small>
          </button>
        </div>
      </template>
      <template v-else-if="event">
        <div class="event-glyph">遇</div><p class="eyebrow">途中奇遇</p><h2>{{ event.title }}</h2><p class="event-copy">{{ event.description }}</p>
        <div class="event-options">
          <button v-for="(option, index) in event.options" :key="option.id" :disabled="!allowed(option)" @click="game.chooseEvent(option.id)">
            <span>{{ ['壹', '贰', '叁'][index] }}</span><b>{{ option.label }}</b><small>选择后方知因果</small>
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
