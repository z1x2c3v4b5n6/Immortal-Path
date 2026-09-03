<script setup lang="ts">
import { computed } from 'vue'
import { bodyStageName, pathById, swordIntentName } from '../data/cultivationPaths'
import { useGameStore } from '../stores/game'
import { calculateFiveElementBalance } from '../core/aptitude/aptitude'
import { techniqueById } from '../data/techniques'
const game = useGameStore()
const progress = computed(() => Math.min(100, (game.player!.cultivation / game.player!.cultivationRequired) * 100))
const stats = computed<Array<[string, number, number]>>(() => [
  ['悟性', game.player!.stats.comprehension, game.player!.statPotential.comprehension], ['气运', game.player!.stats.luck, game.player!.statPotential.luck], ['体魄', game.player!.stats.constitution, game.player!.statPotential.constitution],
  ['神识', game.player!.stats.soul, game.player!.statPotential.soul], ['魅力', game.player!.stats.charm, game.player!.statPotential.charm],
])
const breakthroughStability = computed(() => game.player!.spiritRoot.breakthroughModifier >= .02 ? '较高' : game.player!.spiritRoot.breakthroughModifier <= -.02 ? '略低' : '平稳')
const primaryProgress = computed(() => game.player!.pathProgress.find((entry) => entry.pathId === game.player!.primaryPath))
const activeTechnique = computed(() => game.player!.activeTechnique ? techniqueById(game.player!.activeTechnique) : undefined)
const fiveElementBalance = computed(() => calculateFiveElementBalance(game.player!.spiritualAptitude))
</script>

<template>
  <aside class="player-panel panel">
    <div class="eyebrow">今世道途 · {{ game.player!.entryType === 'initial' ? '初入人间' : game.player!.entryType === 'bloodline' ? '血脉延续' : '轮回转世' }}</div>
    <div class="identity"><div class="avatar">{{ game.player!.name.slice(0, 1) }}</div><div><h2>{{ game.player!.name }}</h2><p>{{ game.player!.origin.name }}</p></div></div>
    <div class="realm-badge"><small>当前境界</small><strong>{{ game.currentRealm.name }}</strong></div>
    <div class="progress-block">
      <div><span>修为</span><b>{{ Math.floor(game.player!.cultivation).toLocaleString() }} / {{ game.player!.cultivationRequired.toLocaleString() }}</b></div>
      <div class="progress"><i :style="{ width: `${progress}%` }"></i></div>
    </div>
    <div class="vitals">
      <div><small>年岁</small><strong>{{ game.ageYears }}</strong><span>岁</span></div>
      <div v-if="game.player!.primaryPath === 'ghost'"><small>魂体</small><strong>{{ Math.round(game.player!.soulStability ?? 0) }}</strong><span>%</span></div><div v-else><small>{{ game.agingStatus }}</small><strong>{{ game.remainingYears }}</strong><span>年</span></div>
      <div><small>灵石</small><strong>{{ game.player!.spiritStones }}</strong><span>枚</span></div>
    </div>
    <div class="root-card"><small>先天灵根</small><b>{{ game.player!.spiritualAptitude.innateRoot.name }}</b><p>元素 {{ game.player!.spiritualAptitude.innateRoot.elements.join(' · ') }}</p><p>总修炼 ×{{ game.player!.spiritRoot.cultivationMultiplier.toFixed(2) }} · 专精 ×{{ game.player!.spiritRoot.specializationMultiplier.toFixed(2) }} · 突破 {{ breakthroughStability }}</p><p v-if="game.player!.spiritualAptitude.acquiredRoots.length">后天：<span v-for="root in game.player!.spiritualAptitude.acquiredRoots" :key="root.id">{{ root.element }}（纯{{ root.purity }}/稳{{ root.stability }}） </span></p><p>五行均衡 {{ fiveElementBalance }}%</p></div>
    <div class="path-card"><small>道途</small><b v-if="game.player!.primaryPath">主道：{{ pathById(game.player!.primaryPath)?.name }} Lv.{{ primaryProgress?.level ?? 1 }}</b><b v-else>尚未正式踏上道途</b><p v-if="game.player!.secondaryPaths.length">兼修：{{ pathById(game.player!.secondaryPaths[0].pathId)?.name }} Lv.{{ game.player!.secondaryPaths[0].level }}</p><p v-if="game.player!.primaryPath === 'sword'">{{ swordIntentName(game.player!.pathResources.swordIntent) }} · 剑意 {{ game.player!.pathResources.swordIntent }}</p><p v-if="game.player!.primaryPath === 'body'">{{ bodyStageName(game.player!.pathResources.bodyStage) }} · 气血 {{ game.player!.pathResources.qiBlood }} / {{ game.player!.pathResources.maxQiBlood }}</p><p v-if="game.player!.primaryPath === 'demonic'">魔性 {{ game.player!.pathResources.demonicNature }} · 心魔 {{ game.player!.pathResources.innerDemon }} · 业力 {{ game.player!.pathResources.karma }}</p><p v-if="game.player!.primaryPath === 'ghost'">魂体稳定 {{ Math.round(game.player!.soulStability ?? 0) }}%</p></div>
    <div class="stat-list"><div v-for="stat in stats" :key="stat[0]"><span>{{ stat[0] }}</span><b>{{ stat[1] }} / {{ stat[2] }}</b><i><em :style="{ width: `${Math.min(100, stat[1] / stat[2] * 100)}%` }"></em></i></div></div>
    <div v-if="activeTechnique" class="root-card"><small>主修功法</small><b>《{{ activeTechnique.name }}》</b><p>{{ activeTechnique.grade }} · {{ activeTechnique.description }}</p></div>
    <div class="talent-tags"><span v-for="talent in game.player!.talents" :key="talent.id" :title="talent.description">{{ talent.name }}</span><span v-for="talent in game.player!.acquiredTalents" :key="talent.talentId" class="acquired">后天·{{ talent.name }}</span></div>
    <div class="bloodline-note"><small>{{ game.player!.bloodline.familyName }}</small><span>{{ game.player!.bloodline.inheritedTraits.join(' · ') || '凡俗血脉' }}</span></div>
  </aside>
</template>
