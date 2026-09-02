<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { allocateStat, availableTalents, randomizeStats, randomSpiritRoot, randomTalentIds, selectableOrigins, STAT_KEYS, STAT_LABELS, totalFreeStatPoints, validateBuild } from '../core/creation/creation'
import { random } from '../core/random/RandomService'
import { potentialRating } from '../core/stats/stats'
import { CREATION_CONFIG } from '../data/creationConfig'
import { ELEMENTS, manualSpiritRoot, SPIRIT_ROOT_ARCHETYPES } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import type { PlayerStats, StatKey } from '../models'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const first = computed(() => game.state.lifeRecords.length === 0)
const origins = computed(() => selectableOrigins(first.value, game.state.reincarnation))
const originId = ref(origins.value[0].id)
const origin = computed(() => origins.value.find((entry) => entry.id === originId.value) ?? origins.value[0])
const name = ref('')
const statMode = ref<'manual' | 'random'>('manual')
const rootMode = ref<'manual' | 'random'>('manual')
const talentMode = ref<'manual' | 'random'>('manual')
const stats = reactive<PlayerStats>({ ...origin.value.baseStats })
const selectedRootRank = ref(4)
const selectedElements = ref<string[]>(['水', '木'])
const rolledRoot = ref(randomSpiritRoot(random, 3, 7))
const selectedTalents = ref<string[]>([])
const error = ref('')
const capBonus = computed(() => first.value ? 0 : game.state.reincarnation.selections.statCapBonus)
const talentBudget = computed(() => CREATION_CONFIG.baseTalentPoints + (first.value ? 0 : game.state.reincarnation.selections.extraTalentPoints) + (talentMode.value === 'random' ? CREATION_CONFIG.randomTalentPointBonus : 0))
const talentPool = computed(() => availableTalents(game.state.reincarnation, game.state.lifeRecords.length, first.value))
const talentSpent = computed(() => selectedTalents.value.reduce((sum, id) => sum + (TALENTS.find((talent) => talent.id === id)?.cost ?? 0), 0))
const manualRoot = computed(() => manualSpiritRoot(selectedRootRank.value, selectedElements.value))
const spiritRoot = computed(() => rootMode.value === 'random' ? rolledRoot.value : manualRoot.value)
const totalStatBudget = computed(() => totalFreeStatPoints(origin.value, spiritRoot.value))
const spentStats = computed(() => STAT_KEYS.reduce((sum, key) => sum + stats[key] - origin.value.baseStats[key], 0))
const remainingStats = computed(() => totalStatBudget.value - spentStats.value)
const maxManualRootRank = computed(() => first.value ? 4 : game.state.reincarnation.selections.maxRootRank)
const lockedTalents = computed(() => TALENTS.filter((talent) => !talentPool.value.some((entry) => entry.id === talent.id)).slice(0, 5))
const isDev = import.meta.env.DEV

function resetStats() {
  Object.assign(stats, origin.value.baseStats)
  if (statMode.value === 'random') Object.assign(stats, randomizeStats(origin.value, capBonus.value, random, spiritRoot.value.statPointBonus))
}
watch(originId, () => { resetStats(); selectedTalents.value = [] })
watch(() => spiritRoot.value.statPointBonus, () => { if (statMode.value === 'random') resetStats() })
function randomOrigin() { originId.value = random.pick(origins.value).id }

function changeStat(key: StatKey, delta: number) {
  const result = allocateStat({ ...stats }, key, delta, origin.value, capBonus.value, remainingStats.value)
  Object.assign(stats, result.stats)
}
function randomStats() { statMode.value = 'random'; Object.assign(stats, randomizeStats(origin.value, capBonus.value, random, spiritRoot.value.statPointBonus)) }
function manualStats() { statMode.value = 'manual'; resetStats() }
function rerollRoot() {
  rootMode.value = 'random'
  const originLuck = origin.value.modifiers.filter((modifier) => modifier.type === 'rootLuck').reduce((sum, modifier) => sum + modifier.value, 0)
  rolledRoot.value = randomSpiritRoot(random, 3 + originLuck, 7)
}
function setRootRank(rank: number) {
  selectedRootRank.value = rank
  if (rank === 1) selectedElements.value = [...ELEMENTS]
  else if (rank === 2) selectedElements.value = ['木', '水', '火', '土']
  else if (rank === 3) selectedElements.value = ['金', '水', '木']
  else if (rank === 4) selectedElements.value = ['水', '木']
  else if (rank === 5) selectedElements.value = ['火']
  else selectedElements.value = [...(SPIRIT_ROOT_ARCHETYPES.find((root) => root.rank === rank)?.elements ?? [])]
}
function toggleElement(element: string) {
  if (selectedRootRank.value < 3 || selectedRootRank.value > 5) return
  const count = 6 - selectedRootRank.value
  if (selectedElements.value.includes(element)) selectedElements.value = selectedElements.value.filter((entry) => entry !== element)
  else if (selectedElements.value.length < count) selectedElements.value.push(element)
}
function toggleTalent(id: string) {
  if (talentMode.value !== 'manual') return
  if (selectedTalents.value.includes(id)) selectedTalents.value = selectedTalents.value.filter((entry) => entry !== id)
  else {
    const cost = TALENTS.find((talent) => talent.id === id)?.cost ?? 0
    if (talentSpent.value + cost <= talentBudget.value) selectedTalents.value.push(id)
  }
}
function randomTalents() { talentMode.value = 'random'; selectedTalents.value = randomTalentIds(talentBudget.value, talentPool.value, random) }
function manualTalents() { talentMode.value = 'manual'; selectedTalents.value = [] }
function submit() {
  const build = { name: name.value, originId: originId.value, spiritRoot: spiritRoot.value, stats: { ...stats }, talentIds: selectedTalents.value, talentBudget: talentBudget.value, randomRoot: rootMode.value === 'random', randomTalents: talentMode.value === 'random' }
  error.value = validateBuild(build, origin.value, capBonus.value, talentPool.value)
  if (!error.value) game.createCharacter(build)
}
</script>

<template>
  <div class="creator-view">
    <header class="creator-head"><div><p class="eyebrow">{{ first ? '第一世 · 命数初启' : `第 ${game.state.lifeRecords.length + 1} 世 · 轮回择命` }}</p><h1>此身从何处来，<br><i>此心向何处去。</i></h1></div><div class="fate-summary" v-if="!first"><span>轮回加持</span><b>天赋 +{{ game.state.reincarnation.selections.extraTalentPoints }}</b><b>属性上限 +{{ game.state.reincarnation.selections.statCapBonus }}</b></div></header>

    <section class="creation-section panel"><div class="creation-index">一</div><div class="creation-content"><div class="section-title"><div><span class="eyebrow">NAME & ORIGIN</span><h2>名讳与出身</h2></div><div class="origin-name-row"><button @click="randomOrigin">随机出身</button><input v-model="name" maxlength="12" placeholder="留空则由天意择名" /></div></div><div class="origin-grid"><button v-for="entry in origins" :key="entry.id" :class="{ selected: originId === entry.id }" @click="originId = entry.id"><b>{{ entry.name }}</b><small>{{ entry.startingSpiritStones }} 灵石 · {{ entry.freeStatPoints }} 出身自由点</small></button></div><div class="origin-detail"><p>{{ origin.description }}</p><div><span v-for="tag in origin.tags" :key="tag">{{ tag }}</span></div><small>{{ origin.modifiers.map(modifier => modifier.description).join(' · ') }}</small></div></div></section>

    <section class="creation-section panel"><div class="creation-index">二</div><div class="creation-content"><div class="section-title"><div><span class="eyebrow">SPIRIT ROOT</span><h2>灵根</h2></div><div class="mode-tabs"><button :class="{ active: rootMode === 'manual' }" @click="rootMode = 'manual'">自行选择</button><button :class="{ active: rootMode === 'random' }" @click="rerollRoot">随机灵根</button></div></div><div v-if="rootMode === 'manual'"><div class="root-ranks"><button v-for="root in SPIRIT_ROOT_ARCHETYPES.filter(root => root.rank <= maxManualRootRank)" :key="root.rank" :class="{ selected: selectedRootRank === root.rank }" @click="setRootRank(root.rank)">{{ root.name }}</button></div><div v-if="selectedRootRank >= 3 && selectedRootRank <= 5" class="element-row"><button v-for="element in ELEMENTS" :key="element" :class="{ selected: selectedElements.includes(element) }" @click="toggleElement(element)">{{ element }}</button><small>选择 {{ 6 - selectedRootRank }} 种元素</small></div></div><div v-else class="random-result"><button @click="rerollRoot">再问天意</button><small>随机角色额外获得 {{ 3 }} 点气运</small></div><div class="root-preview"><span>灵根</span><strong>{{ spiritRoot.name }}</strong><p>修炼倍率 ×{{ spiritRoot.multiplier.toFixed(2) }} · 灵根补偿 +{{ spiritRoot.statPointBonus }} 自由属性点</p></div></div></section>

    <section class="creation-section panel"><div class="creation-index">三</div><div class="creation-content"><div class="section-title"><div><span class="eyebrow">FIVE VIRTUES</span><h2>五维属性</h2></div><div class="mode-tabs"><button :class="{ active: statMode === 'manual' }" @click="manualStats">自行分配</button><button :class="{ active: statMode === 'random' }" @click="randomStats">随机属性</button></div></div><div class="stat-budget-breakdown"><span>出身自由属性点 <b>{{ origin.freeStatPoints }}</b></span><i>＋</i><span>{{ spiritRoot.name }}补偿 <b>{{ spiritRoot.statPointBonus }}</b></span><i>＝</i><span>本次可分配 <b>{{ totalStatBudget }}</b></span></div><div class="attribute-builder"><div v-for="key in STAT_KEYS" :key="key"><span>{{ STAT_LABELS[key] }}</span><button :disabled="statMode === 'random' || stats[key] <= origin.baseStats[key]" @click="changeStat(key, -1)">−</button><strong>{{ stats[key] }}</strong><button :disabled="statMode === 'random' || remainingStats <= 0 || stats[key] >= origin.statCaps[key] + capBonus" @click="changeStat(key, 1)">＋</button><i><em :style="{ width: `${Math.min(100, stats[key] / (origin.statCaps[key] + capBonus) * 100)}%` }"></em></i><small>潜力 {{ potentialRating(origin.statCaps[key] + capBonus) }}<template v-if="isDev"> · {{ origin.statCaps[key] + capBonus }}</template></small></div></div><div class="budget-line">剩余自由属性点 <b>{{ remainingStats }}</b><span>自由属性点只用于五维；天赋点是另一种独立资源。</span></div></div></section>

    <section class="creation-section panel"><div class="creation-index">四</div><div class="creation-content"><div class="section-title"><div><span class="eyebrow">TALENTS · 独立于自由属性</span><h2>天赋</h2></div><div class="mode-tabs"><button :class="{ active: talentMode === 'manual' }" @click="manualTalents">自行选择</button><button :class="{ active: talentMode === 'random' }" @click="randomTalents">随机天赋</button></div></div><div class="talent-budget">独立天赋点 <strong>{{ talentBudget - talentSpent }}</strong> / {{ talentBudget }}<span v-if="talentMode === 'random'">随机模式获得 +1 点天赋价值</span></div><div class="talent-picker"><button v-for="talent in talentPool" :key="talent.id" :class="{ selected: selectedTalents.includes(talent.id) }" @click="toggleTalent(talent.id)"><span>{{ talent.quality }} · {{ talent.cost }}点</span><b>{{ talent.name }}</b><small>{{ talent.description }}</small></button><div v-for="talent in lockedTalents" :key="talent.id" class="talent-locked"><span>尚未满足因果</span><b>？？？</b><small>{{ talent.unlockRequirement?.description ?? '需由轮回殿解锁选择权限' }}</small></div></div></div></section>

    <footer class="creator-footer"><p v-if="error" class="form-error">{{ error }}</p><p v-else>出身定其始，选择定其路。所有数值将在踏入仙途后写入本地存档。</p><button class="primary" @click="submit">踏入仙途</button></footer>
  </div>
</template>
