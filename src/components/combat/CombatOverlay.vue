<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { COMBAT_STRATEGIES } from '../../core/combat/combatStrategy'
import { combatDisplayAssessment } from '../../core/combat/combatPresentation'
import { combatOutcomeName } from '../../core/combat/combatResult'
import { CombatStrategy, type BattleCard, type CombatOutcome, type CombatRecord, type CombatRound, type PendingCombat } from '../../models'
import { useGameStore } from '../../stores/game'
import CombatArena from './CombatArena.vue'
import CombatLogPlayer from './CombatLogPlayer.vue'

const props = withDefaults(defineProps<{ displayMode?: 'overlay' | 'embedded' }>(), { displayMode: 'overlay' })
const game = useGameStore()
const router = useRouter()
const isDev = import.meta.env.DEV
const captured = shallowRef<PendingCombat>()
const record = shallowRef<CombatRecord>()
const currentRound = shallowRef<CombatRound>()
const selectedStrategy = ref(CombatStrategy.BALANCED)
const selectedCardId = ref('')
const usedCard = shallowRef<BattleCard>()
const playbackComplete = ref(false)
const observing = ref(false)
const cardPickerOpen = ref(false)

const activeBattle = computed(() => game.pendingCombat ?? captured.value)
const assessment = computed(() => combatDisplayAssessment(game.combatAssessment || (record.value ? (record.value.playerPower / Math.max(1, record.value.enemyPower) > 1 ? '略强' : '强敌') : '势均力敌')))
const sourceNames: Record<string, string> = { ADVENTURE: '历练遭遇', LIFE_EVENT: '人生事件', SECT_EVENT: '宗门事件', FAMILY_EVENT: '家族事件', NPC_DUEL: '同门切磋', DEBUG: '调试演武' }
const sourceName = computed(() => sourceNames[activeBattle.value?.context?.sourceType ?? 'DEBUG'])
const riskStars = computed(() => '★'.repeat(activeBattle.value?.context?.riskLevel ?? 0) + '☆'.repeat(4 - (activeBattle.value?.context?.riskLevel ?? 0)))
const selectedCard = computed(() => game.player?.battleCards.find((card) => card.id === selectedCardId.value))
const injuryName = computed(() => ({ none: '无伤', injured: '轻伤', serious: '重伤', 'near-death': '濒死', death: '战死' }[record.value?.injury ?? 'none']))

watch(() => game.pendingCombat, (next, previous) => {
  if (next) {
    captured.value = next; record.value = undefined; currentRound.value = undefined; playbackComplete.value = false
    selectedStrategy.value = CombatStrategy.BALANCED; selectedCardId.value = ''; usedCard.value = undefined; observing.value = false; cardPickerOpen.value = false
  } else if (previous && !record.value) {
    captured.value = previous
    const latest = game.player?.combatHistory[0]
    if (latest && latest.enemyName === previous.enemy.name && latest.environment === previous.environment) { record.value = latest; playbackComplete.value = false }
  }
}, { immediate: true })

function begin(strategy?: CombatStrategy, forceOutcome?: CombatOutcome) {
  if (!game.pendingCombat) return
  if (strategy) selectedStrategy.value = strategy
  captured.value = game.pendingCombat
  usedCard.value = selectedCard.value ? { ...selectedCard.value } : undefined
  const result = game.resolvePendingCombat(selectedStrategy.value, selectedCardId.value || undefined, forceOutcome)
  if (result) { record.value = result; playbackComplete.value = false; currentRound.value = undefined }
}
function chooseCard() {
  cardPickerOpen.value = true
  if (!selectedCardId.value && game.player?.battleCards[0]) selectedCardId.value = game.player.battleCards[0].id
}
function close() {
  const died = record.value?.outcome === 'death'
  record.value = undefined; captured.value = undefined; currentRound.value = undefined; playbackComplete.value = false
  if (died) void router.push('/')
}
</script>

<template>
  <Teleport to="body" :disabled="props.displayMode === 'embedded'">
    <Transition name="combat-overlay">
      <div v-if="activeBattle" class="combat-overlay-backdrop" :class="{ embedded: props.displayMode === 'embedded' }">
        <section class="combat-overlay" role="dialog" aria-modal="true" :aria-label="`${sourceName}：${activeBattle.enemy.name}`">
          <header class="combat-overlay-head">
            <div><p class="eyebrow">{{ sourceName }} · {{ activeBattle.context?.location ?? activeBattle.environment }}</p><h2>{{ record ? '战局已定' : `遭遇 ${activeBattle.enemy.name}` }}</h2></div>
            <div class="combat-source-badge"><span>{{ riskStars }}</span><small>{{ activeBattle.context?.returnState?.label ?? '原路返回' }}</small></div>
          </header>

          <div class="combat-overlay-scroll">
            <CombatArena :pending="activeBattle" :record="record" :current-round="currentRound" />

            <template v-if="!record">
              <section class="combat-assessment" :data-tone="assessment.tone"><span>实力判断</span><b>【{{ assessment.label }}】</b><p>{{ assessment.detail }}</p><strong>{{ game.combatPower?.total.toLocaleString() }} <i>对</i> {{ activeBattle.enemy.combatPower.toLocaleString() }}</strong></section>
              <p class="combat-enemy-copy">{{ activeBattle.enemy.description }}</p>
              <div class="embedded-strategy-grid">
                <button v-for="strategy in COMBAT_STRATEGIES" :key="strategy.id" :class="{ active: selectedStrategy === strategy.id, desperate: strategy.id === CombatStrategy.DESPERATE }" @click="selectedStrategy = strategy.id"><b>{{ strategy.name }}</b><small>{{ strategy.description }}</small></button>
              </div>
              <section v-if="cardPickerOpen || game.player?.battleCards.length" class="overlay-card-picker">
                <header><span>临阵底牌</span><small>发动后会消耗一次使用次数</small></header>
                <div><button :class="{ active: !selectedCardId }" @click="selectedCardId = ''">不使用</button><button v-for="card in game.player?.battleCards" :key="card.id" :class="{ active: selectedCardId === card.id }" @click="selectedCardId = card.id"><b>{{ card.name }}</b><small>{{ card.description }} · {{ card.charges }}次</small></button></div>
              </section>
              <div v-if="observing" class="enemy-observation"><span>观察所得</span><p>对方主修{{ activeBattle.enemy.path }}道，灵力偏向{{ activeBattle.enemy.elements.join('、') }}；推荐至少达到相近境界再战。</p></div>
              <footer class="combat-preflight-actions"><button class="primary" @click="begin()">迎战</button><button class="button" @click="begin(CombatStrategy.ESCAPE)">尝试逃跑</button><button class="button" :disabled="!game.player?.battleCards.length" @click="chooseCard">使用底牌</button><button class="text-button" @click="observing = !observing">{{ observing ? '收起观察' : '观察对方' }}</button></footer>
              <footer v-if="isDev" class="combat-overlay-debug"><span>Debug</span><button @click="game.debug('setEnemyPower')">敌人战力 ×2</button><button @click="begin(undefined, 'victory')">强制胜利</button><button @click="begin(undefined, 'defeat')">强制战败</button><button @click="begin(CombatStrategy.ESCAPE, 'escape')">强制逃跑</button></footer>
            </template>

            <template v-else>
              <section v-if="usedCard" class="battle-card-burst" :data-card="usedCard.type"><div><span>底</span><p>发动底牌</p><h3>【{{ usedCard.name }}】</h3></div><p>{{ usedCard.description }}</p><dl><div><dt>临时战力</dt><dd>{{ record.playerPower }} → {{ Math.round(record.playerPower * (1 + usedCard.powerMultiplier)) }}</dd></div><div v-if="usedCard.lifespanCost"><dt>寿元损耗</dt><dd>-{{ usedCard.lifespanCost >= 12 ? `${Math.round(usedCard.lifespanCost / 12)}年` : `${usedCard.lifespanCost}月` }}</dd></div></dl></section>
              <CombatLogPlayer :rounds="record.rounds" :skip-token="game.ready.combatAnimationSkipToken" @progress="currentRound = $event" @complete="playbackComplete = true" />
              <Transition name="result-rise">
                <section v-if="playbackComplete" class="combat-result-card" :data-outcome="record.outcome">
                  <div class="result-seal">{{ record.outcome === 'victory' ? '胜' : record.outcome === 'escape' ? '遁' : record.outcome === 'death' ? '陨' : '败' }}</div>
                  <div class="result-copy"><p class="eyebrow">{{ combatOutcomeName(record.outcome) }}</p><h2>{{ record.summary }}</h2><p>对手：{{ record.enemyName }} · 状态：{{ injuryName }}</p></div>
                  <div v-if="record.loot?.length" class="combat-rewards"><span>此战所得</span><div><b v-for="loot in record.loot" :key="loot.id">{{ loot.name }} <em>+{{ loot.quantity }}</em></b></div></div>
                  <button class="primary" @click="close">{{ record.outcome === 'death' ? '进入身后抉择' : activeBattle.context?.returnState?.label ?? '结束战斗' }}</button>
                </section>
              </Transition>
            </template>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
