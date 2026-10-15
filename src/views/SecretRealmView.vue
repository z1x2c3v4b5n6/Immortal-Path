<script setup lang="ts">
import { computed } from 'vue'
import { itemById } from '../data/items'
import { secretRealmRisk } from '../core/secretRealm/secretRealm'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const run = computed(() => game.state.secretRealmRun)
const realm = computed(() => game.activeSecretRealm)
const risk = computed(() => game.player && realm.value ? secretRealmRisk(game.combatPower?.total ?? 0, realm.value, (run.value?.currentDepth ?? 0) + 1) : undefined)
const rewardName = (id: string) => itemById(id)?.name ?? id
</script>

<template>
  <div class="view-page secret-realm-page">
    <header class="page-head"><div><p class="eyebrow">险中求道 · 生死自择</p><h1>秘境</h1><p>逐层探索，战利品只有在安全撤离后才会正式收入乾坤袋。</p></div><div class="calligraphy">境</div></header>
    <div v-if="!game.player" class="empty large-empty"><span>封</span><h2>尚未入世</h2><p>踏上修行路后，秘境传闻才会向你显现。</p></div>

    <template v-else-if="!run">
      <section class="realm-grid">
        <article v-for="entry in game.availableSecretRealms" :key="entry.realm.id" class="panel realm-card" :class="{ locked: !entry.access?.discovered }">
          <header><div><small>{{ entry.realm.environmentTags.join(' · ') }}</small><h2>{{ entry.realm.name }}</h2></div><span>{{ entry.risk.label }}</span></header>
          <p>{{ entry.realm.description }}</p>
          <dl><div><dt>推荐境界</dt><dd>{{ entry.realm.recommendedRealm }}</dd></div><div><dt>推荐战力</dt><dd>{{ entry.realm.recommendedCombatPower?.toLocaleString() }}+</dd></div><div><dt>你的战力</dt><dd>{{ game.combatPower?.total.toLocaleString() }}</dd></div><div><dt>深度</dt><dd>{{ entry.realm.maxDepth }} 层</dd></div></dl>
          <p class="realm-source">{{ entry.access?.discovered ? `线索：${entry.access.source}${entry.access.accessUntilYear ? ` · 至玄历${entry.access.accessUntilYear}年` : ''}` : '尚未发现入口，可从世界、宗门、人生事件或特殊道具获知。' }}</p>
          <button class="primary" :disabled="!entry.access?.discovered || (entry.access.accessUntilYear !== undefined && entry.access.accessUntilYear < game.state.world.currentYear)" @click="game.enterSecretRealm(entry.realm.id)">{{ entry.access?.discovered ? '进入秘境' : '入口未显' }}</button>
        </article>
      </section>
      <section v-if="game.player.secretRealmHistory.length" class="panel realm-history"><div class="section-head"><div><span class="eyebrow">PAST EXPEDITIONS</span><h3>秘境履历</h3></div></div><ol><li v-for="record in game.player.secretRealmHistory.slice(0, 8)" :key="`${record.secretRealmId}-${record.year}-${record.deepestDepth}`"><span>玄历 {{ record.year }} 年</span><b>{{ game.availableSecretRealms.find(entry => entry.realm.id === record.secretRealmId)?.realm.name }}</b><em>深入 {{ record.deepestDepth }} 层 · {{ record.status }}</em></li></ol></section>
    </template>

    <template v-else-if="realm">
      <section class="panel realm-run-banner"><div><span class="eyebrow">SECRET REALM RUN</span><h2>{{ realm.name }}</h2><p>{{ realm.environmentTags.join(' · ') }}</p></div><div class="realm-depth"><small>当前深度</small><strong>{{ run.currentDepth }} / {{ realm.maxDepth }}</strong><span>下一层风险：{{ risk?.label }}</span></div></section>
      <section class="realm-run-layout">
        <div class="panel realm-current">
          <div v-if="run.pendingEncounter"><span class="risk-stars">危险 {{ '★'.repeat(run.pendingEncounter.risk) }}{{ '☆'.repeat(4 - run.pendingEncounter.risk) }}</span><h2>{{ run.pendingEncounter.name }}</h2><p>{{ run.pendingEncounter.description }}</p><p v-if="run.pendingEncounter.type === 'COMBAT'">守关者已经现身，斗法将在当前页面上方展开。</p></div>
          <div v-else-if="run.status === 'CLEARED'"><span class="eyebrow">CLEARED</span><h2>秘境已通关</h2><p>最深处的禁制已经平息。现在离开即可带回全部收获。</p></div>
          <div v-else-if="run.awaitingDecision"><span class="eyebrow">LAYER COMPLETE</span><h2>本层探索完成</h2><p>前方灵机更盛，危险也随深度增长。你可以保住现有战利品，或继续押上这一世的命数。</p></div>
          <div v-else><span class="eyebrow">READY</span><h2>{{ run.currentDepth ? '继续向深处行进' : '踏入第一层' }}</h2><p>每一层会产生资源、事件、禁制、宝物或嵌入式战斗。</p></div>
          <div class="realm-run-actions">
            <button v-if="run.status === 'ACTIVE' && !run.awaitingDecision && !run.pendingEncounter" class="primary" @click="game.exploreSecretRealm">探索下一层</button>
            <template v-if="run.status === 'ACTIVE' && run.awaitingDecision"><button v-for="route in run.routeChoices" :key="route.id" class="primary route-choice" @click="() => game.continueSecretRealm(route.id)"><b>{{ route.name }}</b><small>风险 {{ route.riskModifier >= 0 ? '+' : '' }}{{ route.riskModifier }} · 奖励 {{ route.rewardModifier >= 0 ? '+' : '' }}{{ route.rewardModifier }}</small></button></template>
            <button v-if="run.status === 'ACTIVE' || run.status === 'CLEARED'" class="button" @click="game.leaveSecretRealm">{{ run.status === 'CLEARED' ? '带回全部战利品' : '撤离秘境' }}</button>
          </div>
        </div>
        <aside class="panel realm-loot"><span class="eyebrow">TEMPORARY LOOT</span><h3>临时战利品</h3><ul><li v-for="reward in run.collectedRewards" :key="reward.itemId"><span>{{ rewardName(reward.itemId) }}</span><b>×{{ reward.quantity }}</b></li><li v-if="!run.collectedRewards.length" class="muted">尚无收获</li></ul><p>安全撤离后正式入袋；秘境死亡只损失其中 50%，不会动用原有背包。</p><h4>状态</h4><p>{{ run.injuries.join(' · ') || '无伤' }}</p></aside>
      </section>
      <section class="panel realm-events"><div class="section-head"><div><span class="eyebrow">EXPEDITION LOG</span><h3>探索记录</h3></div></div><ol><li v-for="entry in [...run.eventHistory].reverse()" :key="entry">{{ entry }}</li></ol></section>
    </template>
  </div>
</template>

<style scoped>
.realm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.realm-card{display:flex;flex-direction:column}.realm-card.locked{opacity:.58}.realm-card header{display:flex;justify-content:space-between;gap:16px}.realm-card h2{margin:4px 0}.realm-card header>span,.risk-stars{color:#d7ab57}.realm-card dl{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.realm-card dl div{padding:9px;border:1px solid rgba(200,164,91,.17)}.realm-card dt{font-size:.72rem;color:var(--muted)}.realm-card dd{margin:3px 0 0}.realm-card button{margin-top:auto}.realm-source{min-height:44px;color:var(--muted);font-size:.8rem}.realm-run-banner{display:flex;justify-content:space-between;align-items:center}.realm-depth{text-align:right}.realm-depth strong{display:block;color:#e2be70;font-size:1.8rem}.realm-depth span{font-size:.8rem;color:var(--muted)}.realm-run-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,.7fr);gap:16px}.realm-current{min-height:300px;display:flex;flex-direction:column;justify-content:center}.realm-run-actions{display:flex;gap:10px;margin-top:22px}.realm-loot ul{list-style:none;padding:0}.realm-loot li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(200,164,91,.14)}.realm-loot p{font-size:.8rem;color:var(--muted)}.realm-events ol,.realm-history ol{margin:0;padding-left:20px}.realm-history li{display:grid;grid-template-columns:130px 1fr 1fr;padding:8px}.realm-history em{color:var(--muted)}@media(max-width:850px){.realm-grid,.realm-run-layout{grid-template-columns:1fr}.realm-run-banner{align-items:flex-start}.realm-history li{grid-template-columns:1fr}}
</style>
