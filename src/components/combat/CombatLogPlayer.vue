<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { playbackRounds } from '../../core/combat/combatPresentation'
import type { CombatRound } from '../../models'

const props = withDefaults(defineProps<{ rounds: CombatRound[]; skipToken?: number }>(), { skipToken: 0 })
const emit = defineEmits<{ progress: [round?: CombatRound]; complete: [] }>()
const visibleCount = ref(0)
const accelerated = ref(false)
const skipped = ref(false)
const logElement = ref<HTMLElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let completionSent = false

function clearTimer() { if (timer) clearTimeout(timer); timer = undefined }
function complete() { if (!completionSent) { completionSent = true; emit('complete') } }
function schedule() {
  clearTimer()
  if (visibleCount.value >= props.rounds.length) { complete(); return }
  timer = setTimeout(() => {
    visibleCount.value++
    emit('progress', props.rounds[visibleCount.value - 1])
    void nextTick(() => { if (logElement.value) logElement.value.scrollTop = logElement.value.scrollHeight })
    schedule()
  }, accelerated.value ? 180 : 720)
}
function restart() { clearTimer(); visibleCount.value = 0; skipped.value = false; completionSent = false; emit('progress', undefined); schedule() }
function toggleSpeed() { accelerated.value = !accelerated.value; schedule() }
function skip() { clearTimer(); skipped.value = true; visibleCount.value = props.rounds.length; emit('progress', props.rounds[props.rounds.length - 1]); complete() }

watch(() => props.rounds, restart, { immediate: true })
watch(() => props.skipToken, (next, previous) => { if (next !== previous && props.rounds.length) skip() })
onBeforeUnmount(clearTimer)
</script>

<template>
  <section class="combat-log-player">
    <header><div><p class="eyebrow">BATTLE PERFORMANCE</p><h3>斗法演出</h3></div><div><button :class="{ active: accelerated }" @click="toggleSpeed">{{ accelerated ? '正常速度' : '加速' }}</button><button @click="skip">跳过动画</button></div></header>
    <ol ref="logElement">
      <li v-if="visibleCount === 0"><span>序</span><p>双方气机锁定，山风仿佛也在此刻停滞。</p></li>
      <li v-for="(round, index) in playbackRounds(rounds, visibleCount, skipped)" :key="`${round.round}-${round.actor}-${index}`" :class="[round.actor, { critical: round.damage > 100 }]">
        <span>{{ round.round }}</span><div><small>{{ round.actor === 'player' ? '己方出手' : '敌方反击' }}</small><p>{{ round.text }}</p><b v-if="round.damage">{{ round.damage }} 伤害</b></div>
      </li>
    </ol>
  </section>
</template>
