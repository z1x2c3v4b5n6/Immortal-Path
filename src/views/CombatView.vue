<script setup lang="ts">
import { computed, ref } from 'vue'
import { COMBAT_STRATEGIES } from '../core/combat/combatStrategy'
import { combatOutcomeName } from '../core/combat/combatResult'
import { CombatStrategy } from '../models'
import { REALMS } from '../data/realms'
import { pathById } from '../data/cultivationPaths'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const selectedStrategy = ref(CombatStrategy.BALANCED)
const selectedCard = ref('')
const latest = computed(() => game.player?.combatHistory[0])
const power = computed(() => game.combatPower)
const winRate = computed(() => game.player?.battleStats.battles ? Math.round(game.player.battleStats.wins / game.player.battleStats.battles * 100) : 0)

function fight() {
  game.resolvePendingCombat(selectedStrategy.value, selectedCard.value || undefined)
  selectedCard.value = ''
}
</script>

<template>
  <div class="view-page combat-page">
    <header class="page-head"><div><p class="eyebrow">斗法争命，胜负非止一数</p><h1>斗法</h1><p>战力用于衡量大势；灵根克制、战场环境、道途与临阵抉择，才决定最后一线生机。</p></div><div class="calligraphy">战</div></header>
    <div v-if="!game.player" class="empty large-empty"><span>战</span><h2>尚未入世</h2><p>创建角色后，方能以此身叩问强敌。</p></div>
    <template v-else>
      <section class="panel combat-overview">
        <div><p class="eyebrow">当前战力</p><strong>{{ power?.total.toLocaleString() }}</strong><span>{{ game.currentRealm.name }} · {{ pathById(game.player.primaryPath ?? 'dao')?.name }}</span></div>
        <dl v-if="power"><div><dt>境界根基</dt><dd>{{ power.realm }}</dd></div><div><dt>功法</dt><dd>{{ power.technique }}</dd></div><div><dt>灵根契合</dt><dd>{{ power.root }}</dd></div><div><dt>五维属性</dt><dd>{{ power.stats }}</dd></div><div><dt>道途</dt><dd>{{ power.path }}</dd></div><div><dt>法宝</dt><dd>{{ power.artifacts }}</dd></div><div><dt>状态</dt><dd :class="{ negative: power.state < 0 }">{{ power.state > 0 ? '+' : '' }}{{ power.state }}</dd></div><div><dt>战斗经验</dt><dd>{{ power.experience }}</dd></div></dl>
        <div class="battle-stat-strip"><span>斗法 <b>{{ game.player.battleStats.battles }}</b></span><span>胜绩 <b>{{ game.player.battleStats.wins }}</b></span><span>胜率 <b>{{ winRate }}%</b></span><span>越级胜 <b>{{ game.player.battleStats.upsetWins }}</b></span></div>
      </section>

      <section v-if="game.pendingCombat" class="panel combat-encounter">
        <div class="duel-board">
          <article class="combatant self"><small>己方</small><h2>{{ game.player.name }}</h2><p>{{ game.currentRealm.name }}</p><strong>{{ power?.total.toLocaleString() }}</strong><span>{{ game.player.characterStates.join(' · ') }}</span></article>
          <div class="versus"><b>斗</b><span :class="`assessment assessment-${game.combatAssessment}`">{{ game.combatAssessment }}</span><small>{{ game.pendingCombat.environment }}</small></div>
          <article class="combatant enemy"><small>{{ game.pendingCombat.enemy.type === 'beast' ? '妖兽' : '敌修' }}</small><h2>{{ game.pendingCombat.enemy.name }}</h2><p>{{ REALMS[game.pendingCombat.enemy.realmIndex].name }}</p><strong>{{ game.pendingCombat.enemy.combatPower.toLocaleString() }}</strong><span>{{ game.pendingCombat.enemy.elements.join(' · ') }} · {{ pathById(game.pendingCombat.enemy.path)?.name }}</span></article>
        </div>
        <p class="enemy-copy">{{ game.pendingCombat.enemy.description }}</p>
        <div class="strategy-grid"><button v-for="strategy in COMBAT_STRATEGIES" :key="strategy.id" :class="{ selected: selectedStrategy === strategy.id, desperate: strategy.id === CombatStrategy.DESPERATE }" @click="selectedStrategy = strategy.id"><b>{{ strategy.name }}</b><small>{{ strategy.description }}</small></button></div>
        <div v-if="game.player.battleCards.length" class="battle-card-picker"><label>启用底牌</label><select v-model="selectedCard"><option value="">不使用底牌</option><option v-for="card in game.player.battleCards" :key="card.id" :value="card.id">{{ card.name }}（{{ card.charges }}次）· {{ card.description }}</option></select></div>
        <div class="combat-warning"><span>{{ selectedStrategy === CombatStrategy.DESPERATE ? '此法会显著提高败亡风险；魔修还将额外折损寿元。' : selectedStrategy === CombatStrategy.ESCAPE ? '遁逃并非必然成功，境界差距与伤势都会影响结果。' : '斗法存在负伤与死亡可能，请依敌我大势慎重决断。' }}</span><button class="button" @click="fight">{{ selectedStrategy === CombatStrategy.ESCAPE ? '施展遁法' : '开始斗法' }}</button></div>
      </section>

      <section v-else class="panel seek-battle"><div class="section-head"><div><span class="eyebrow">选择对手</span><h3>试锋问道</h3></div><small>主动挑战会立即生成战斗</small></div><div class="encounter-grid"><button @click="game.startCombat('beast', 0, 'adventure', '青云山脉')"><span>妖</span><b>猎杀同阶妖兽</b><small>收益妖丹与灵石，可能负伤或死亡。</small></button><button @click="game.startCombat('cultivator', 0, 'adventure', '荒野古道')"><span>劫</span><b>迎战荒野劫修</b><small>敌人手段复杂，胜后会留下杀修因果。</small></button><button @click="game.startCombat('beast', 1, 'adventure', '赤炎谷')"><span>险</span><b>挑战高阶异兽</b><small>越级挑战，属性克制与底牌尤为重要。</small></button></div></section>

      <section v-if="!game.pendingCombat && game.sectPeers.length" class="panel"><div class="section-head"><div><span class="eyebrow">宗门演武</span><h3>同期切磋</h3></div><small>演武台有同门照看，不会战死</small></div><div class="combat-peer-list"><article v-for="npc in game.sectPeers.slice(0, 8)" :key="npc.id"><div><b>{{ npc.name }}</b><small>{{ REALMS[npc.realmIndex].name }} · 战力 {{ npc.combatPower.toLocaleString() }}</small></div><button class="text-button" @click="game.startNPCCombat(npc.id)">邀战</button></article></div></section>

      <section v-if="latest && !game.pendingCombat" class="panel battle-report"><div class="section-head"><div><span class="eyebrow">最近一战</span><h3>{{ latest.enemyName }} · {{ combatOutcomeName(latest.outcome) }}</h3></div><b :class="`outcome-${latest.outcome}`">{{ latest.playerPower }} : {{ latest.enemyPower }}</b></div><p>{{ latest.summary }}</p><ol><li v-for="round in latest.rounds" :key="`${round.round}-${round.actor}`"><span>第 {{ round.round }} 回合</span><p>{{ round.text }}<b v-if="round.damage">造成 {{ round.damage }} 伤害</b></p></li></ol></section>

      <section v-if="game.player.battleAchievements.length" class="panel battle-achievements"><span class="eyebrow">战斗成就</span><div><b v-for="item in game.player.battleAchievements" :key="item">{{ item }}</b></div></section>
    </template>
  </div>
</template>
