<script setup lang="ts">
import { computed } from 'vue'
import { formatGameTime } from '../core/time/time'
import { pathById } from '../data/cultivationPaths'
import { useGameStore } from '../stores/game'

defineEmits<{ openDetails: [] }>()
const game = useGameStore()
const progress = computed(() => game.player ? Math.min(100, game.player.cultivation / game.player.cultivationRequired * 100) : 0)
const identity = computed(() => game.player?.sectMembership ? `${game.currentSect?.name ?? '山门'} · ${game.player.sectMembership.position}` : '一介散修')
const saveLabel = computed(() => game.ready.saving ? '正在落笔' : game.ready.lastSaved ? `${game.ready.lastSaved} 已存` : '本地存档')
</script>

<template>
  <header class="player-summary-bar" :class="{ empty: !game.player }">
    <div v-if="game.player" class="summary-identity">
      <span class="summary-avatar">{{ game.player.name.slice(0, 1) }}</span>
      <span><b>{{ game.player.name }}</b><small>第 {{ game.player.generation }} 世 · {{ identity }}</small></span>
    </div>
    <div v-else class="summary-identity"><span class="summary-avatar">未</span><span><b>尚未入世</b><small>{{ formatGameTime(game.state.world) }}</small></span></div>

    <div v-if="game.player" class="summary-metrics">
      <div><small>境界</small><strong>{{ game.currentRealm.name }}</strong></div>
      <RouterLink to="/combat"><small>战斗力</small><strong class="combat-value">{{ game.combatPower?.total.toLocaleString() }}</strong></RouterLink>
      <div class="summary-cultivation"><span><small>修为</small><b>{{ Math.floor(progress) }}%</b></span><i><em :style="{ width: `${progress}%` }"></em></i></div>
      <div><small>年龄 / 寿元</small><strong>{{ game.ageYears }} / {{ Math.floor(game.player.lifespanMonths / 12) }}</strong></div>
      <div><small>灵根</small><strong>{{ game.player.spiritualAptitude.innateRoot.name }}</strong></div>
      <div><small>道途</small><strong>{{ pathById(game.player.primaryPath)?.name ?? '未定' }}</strong></div>
    </div>

    <div class="summary-actions">
      <span class="save-state"><i :class="{ pulse: game.ready.saving }"></i>{{ saveLabel }}</span>
      <button v-if="game.player" class="summary-detail-button" @click="$emit('openDetails')">角色详情</button>
    </div>
  </header>
</template>
