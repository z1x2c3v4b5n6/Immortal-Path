<script setup lang="ts">
import { computed, ref } from 'vue'
import { calculateFiveElementBalance, isFiveElementImbalanced } from '../core/aptitude/aptitude'
import { BODY_REALM_NAMES } from '../core/actions/action'
import { calculateBreakthroughChance } from '../core/breakthrough/breakthrough'
import { CULTIVATION_PATHS, pathById } from '../data/cultivationPaths'
import { techniqueById } from '../data/techniques'
import { calculateTechniqueAffinity } from '../core/techniques/techniques'
import { CharacterState, type CultivationAction, type CultivationPathId } from '../models'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const selectedYears = ref<Partial<Record<CultivationAction, number>>>({})
const useAuxiliaries = ref(false)
const useDemonicSacrifice = ref(false)
const chance = computed(() => game.player ? calculateBreakthroughChance(game.player, game.state.world, { useAuxiliaries: useAuxiliaries.value, useDemonicSacrifice: useDemonicSacrifice.value }) : null)
const requirements = computed(() => game.breakthroughRequirements)
const primaryProgress = computed(() => game.player?.pathProgress.find((entry) => entry.pathId === game.player?.primaryPath))
const selectablePrimary = computed(() => CULTIVATION_PATHS.filter((path) => path.id !== 'ghost' && game.player?.unlockedPaths.includes(path.id)))
const selectableSecondary = computed(() => CULTIVATION_PATHS.filter((path) => path.id !== 'ghost' && path.id !== game.player?.primaryPath && game.player?.unlockedPaths.includes(path.id)))
const activeTechnique = computed(() => game.player?.activeTechnique ? techniqueById(game.player.activeTechnique) : undefined)
const activeTechniqueProgress = computed(() => game.player?.techniqueProgress.find((entry) => entry.techniqueId === game.player?.activeTechnique))
const fiveBalance = computed(() => game.player ? calculateFiveElementBalance(game.player.spiritualAptitude) : 0)
const actionBlocked = computed(() => !game.player?.alive || !!game.pendingEvent || !!game.pendingLifeEvent || !!game.state.currentAction)

const stateNames: Record<CharacterState, string> = {
  [CharacterState.NORMAL]: '状态平稳',
  [CharacterState.INJURED]: '负伤',
  [CharacterState.SERIOUS_INJURY]: '重伤',
  [CharacterState.INNER_DEMON]: '心魔缠身',
  [CharacterState.ENLIGHTENED]: '悟道余韵',
  [CharacterState.BOTTLENECK]: '境界瓶颈',
}

function duration(action: CultivationAction, fallback: number) { return selectedYears.value[action] ?? fallback }
function chooseDuration(action: CultivationAction, years: number) { selectedYears.value[action] = years }
function perform(action: CultivationAction, fallback: number) { game.advanceYear(action, duration(action, fallback)) }
function attemptBreakthrough() { game.breakthrough({ useAuxiliaries: useAuxiliaries.value, useDemonicSacrifice: useDemonicSacrifice.value }) }
function choosePrimary(pathId: CultivationPathId) { game.selectPrimaryPath(pathId) }
function chooseSecondary(pathId: CultivationPathId) { game.selectSecondaryPath(pathId) }
function affinity(technique: (typeof game.techniqueCatalog)[number]) {
  const result = calculateTechniqueAffinity(game.player!, technique, game.state.world)
  return { ...result, breakdown: { ...result.breakdown, root: result.breakdown.spiritRoot } }
}
</script>

<template>
  <div v-if="game.player" class="view-page cultivation-page">
    <header class="page-head">
      <div><p class="eyebrow">岁月为炉 · 道行为火</p><h1>修炼</h1><p>当前 {{ game.state.world.currentYear }} 年 · {{ game.state.world.currentMonth }} 月，请选择未来的修行。</p></div>
      <div class="calligraphy">炁</div>
    </header>

    <section class="cultivation-focus panel">
      <div class="focus-ring"><span>{{ Math.min(100, Math.floor(game.player.cultivation / game.player.cultivationRequired * 100)) }}<small>%</small></span></div>
      <div class="focus-copy"><small>当前道行</small><h2>{{ game.currentRealm.name }}</h2><p>修为 {{ Math.floor(game.player.cultivation).toLocaleString() }} / {{ game.player.cultivationRequired.toLocaleString() }}</p><div class="progress large"><i :style="{ width: `${Math.min(100, game.player.cultivation / game.player.cultivationRequired * 100)}%` }"></i></div></div>
      <dl class="focus-details">
        <div><dt>主修功法</dt><dd>{{ activeTechnique ? `《${activeTechnique.name}》 Lv.${activeTechniqueProgress?.level ?? 1}` : '尚未选定' }}</dd></div>
        <div><dt>肉身</dt><dd>{{ BODY_REALM_NAMES[game.player.bodyRealm] }} · {{ game.player.bodyTrainingProgress }}</dd></div>
        <div><dt>突破准备</dt><dd>{{ Math.floor(game.player.breakthroughProgress) }}%</dd></div>
        <div><dt>状态</dt><dd>{{ game.player.characterStates.map(state => stateNames[state]).join(' · ') }}</dd></div>
      </dl>
    </section>

    <section class="panel annual-actions">
      <div class="section-head"><div><p class="eyebrow">ANNUAL ACTION</p><h3>选择未来行动</h3><p>行动会消耗真实年岁，并依次结算成长、状态、人生事件与命运进度。</p></div></div>
      <div class="action-grid">
        <article v-for="action in game.actionCatalog" :key="action.id" class="action-card">
          <header><span>{{ action.glyph }}</span><div><h4>{{ action.name }}</h4><p>{{ action.description }}</p></div></header>
          <div class="duration-options"><button v-for="years in action.durationOptions" :key="years" :class="{ active: duration(action.id, action.defaultDuration) === years }" @click="chooseDuration(action.id, years)">{{ years }}年</button></div>
          <button class="primary action-submit" :disabled="actionBlocked" @click="perform(action.id, action.defaultDuration)">{{ action.name }}{{ duration(action.id, action.defaultDuration) }}年</button>
        </article>
      </div>
      <p v-if="game.pendingEvent || game.pendingLifeEvent" class="action-warning">请先处理当前事件，再决定下一段修行。</p>
    </section>

    <section class="panel resource-panel">
      <div class="section-head"><div><p class="eyebrow">CULTIVATION RESOURCES</p><h3>修行资源</h3></div></div>
      <div class="resource-grid"><div><span>灵石</span><b>{{ game.player.spiritStones }}</b></div><div><span>灵药</span><b>{{ game.player.resources.spiritHerbs }}</b></div><div><span>妖丹</span><b>{{ game.player.resources.beastCores }}</b></div><div><span>炼体材料</span><b>{{ game.player.resources.bodyMaterials }}</b></div><div><span>魂晶</span><b>{{ game.player.resources.soulCrystals }}</b></div></div>
    </section>

    <section class="breakthrough panel" :class="{ available: requirements?.ready }">
      <div class="breakthrough-copy"><p class="eyebrow">破境关隘</p><h3>{{ requirements?.ready ? `${game.currentRealm.name}圆满 · 尝试突破` : '修为圆满后即可尝试突破' }}</h3>
      <p v-if="requirements && requirements.missing.length" class="missing">{{ requirements.missing.join(' · ') }}</p>
      <div v-if="chance" class="chance-breakdown"><span>基础 <b>{{ Math.round(chance.base * 100) }}%</b></span><span>悟性 <b>{{ chance.comprehension >= 0 ? '+' : '' }}{{ Math.round(chance.comprehension * 100) }}%</b></span><span>气运 <b>{{ chance.luck >= 0 ? '+' : '' }}{{ Math.round(chance.luck * 100) }}%</b></span><span>灵根 <b>{{ chance.spiritRoot >= 0 ? '+' : '' }}{{ Math.round(chance.spiritRoot * 100) }}%</b></span><span>功法契合 <b>{{ chance.technique >= 0 ? '+' : '' }}{{ Math.round(chance.technique * 100) }}%</b></span></div>
      <div v-if="chance" class="chance-breakdown"><span>道途 <b>{{ chance.path >= 0 ? '+' : '' }}{{ Math.round(chance.path * 100) }}%</b></span><span>天赋 <b>{{ chance.talent >= 0 ? '+' : '' }}{{ Math.round(chance.talent * 100) }}%</b></span><span>状态 <b>{{ chance.state >= 0 ? '+' : '' }}{{ Math.round(chance.state * 100) }}%</b></span><span>准备 <b>+{{ Math.round(chance.preparation * 100) }}%</b></span><span>辅助 <b>+{{ Math.round(chance.auxiliary * 100) }}%</b></span></div>
      <div class="breakthrough-options"><label><input v-model="useAuxiliaries" type="checkbox"> 使用可用辅助物（筑基丹、灵药及道途资源）</label><label v-if="game.player.primaryPath === 'demonic'"><input v-model="useDemonicSacrifice" type="checkbox"> 血祭五年寿元与十点魔性</label></div>
      <p v-if="chance?.aid.descriptions.length" class="aid-note">本次将消耗：{{ chance.aid.descriptions.join(' · ') }}</p><p v-else class="aid-note">辅助物不是突破门票；不投入资源也可直接尝试。</p></div>
      <div class="breakthrough-attempt"><small>当前成功率</small><strong>{{ chance ? Math.round(chance.final * 100) : 0 }}%</strong><button class="primary" :disabled="!requirements?.ready" @click="attemptBreakthrough">突破</button></div>
    </section>

    <section v-if="game.player.cultivationLogs.length" class="panel cultivation-logs">
      <div class="section-head"><div><p class="eyebrow">CULTIVATION LOG</p><h3>修炼日志</h3></div></div>
      <ol><li v-for="log in game.player.cultivationLogs.slice(0, 16)" :key="log.id"><time>第{{ log.year }}年</time><div><b>{{ log.title }}</b><p>{{ log.summary }}</p></div></li></ol>
    </section>

    <section v-if="game.player.realmIndex >= 1 && !game.player.primaryPath" class="path-awakening panel"><div class="section-head"><div><p class="eyebrow">大道初分</p><h3>选择此世主道</h3><p>主道一经确立，本世不可随意更换。魔修需特殊机缘，鬼修需死后转修。</p></div></div><div class="path-choice-grid"><button v-for="path in selectablePrimary" :key="path.id" @click="choosePrimary(path.id)"><span>{{ path.glyph }}</span><b>{{ path.name }}</b><small>{{ path.description }}</small></button></div></section>
    <section v-else-if="game.player.primaryPath" class="path-training panel"><div><p class="eyebrow">PRIMARY PATH</p><h3>{{ pathById(game.player.primaryPath)?.name }} Lv.{{ primaryProgress?.level ?? 1 }}</h3><p>{{ pathById(game.player.primaryPath)?.description }}</p></div><button class="button" @click="game.pathPractice">专修三月</button><button v-if="game.player.primaryPath === 'demonic'" class="button danger" :disabled="game.player.pathResources.bloodRiteMonthsRemaining > 0" @click="game.bloodRite">血炼术：五年寿元换十年加速</button></section>
    <section v-if="game.player.primaryPath && !game.player.secondaryPaths.length && (primaryProgress?.level ?? 0) >= 3" class="secondary-path panel"><p>可选择一条兼修道途，副道收益低于主道。</p><div><button v-for="path in selectableSecondary" :key="path.id" @click="chooseSecondary(path.id)">兼修 {{ path.name }}</button></div></section>

    <section class="aptitude-panel panel"><div class="section-head"><div><p class="eyebrow">ACQUIRED ROOTS</p><h3>后天灵根与五行成长</h3><p>修炼对应功法会增长元素底蕴；后天灵根可缓慢提纯、稳定。</p></div><b :class="{ warning: isFiveElementImbalanced(game.player.spiritualAptitude) }">五行均衡 {{ fiveBalance }}%</b></div><div v-if="game.player.spiritualAptitude.acquiredRoots.length" class="acquired-root-grid"><article v-for="root in game.player.spiritualAptitude.acquiredRoots" :key="root.id"><strong>{{ root.element }}灵根</strong><small>{{ root.source }} · {{ root.acquiredYear }}年{{ root.acquiredMonth }}月</small><p>纯度 {{ root.purity }} · 稳定 {{ root.stability }} · 成长 {{ game.player.spiritualAptitude.elementalGrowth[root.element] }}</p><div><button :disabled="game.player.spiritStones < 12 || root.purity >= 100" @click="game.improveAcquiredRoot(root.element, 'purify')">提纯 · 12灵石</button><button :disabled="game.player.spiritStones < 12 || root.stability >= 100" @click="game.improveAcquiredRoot(root.element, 'stabilize')">稳固 · 12灵石</button></div></article></div><p v-else class="empty-note">尚未获得后天灵根。天材地宝、雷劫、秘境、血脉、夺灵与轮回残痕均可能改变根基。</p></section>

    <section class="technique-section panel"><div class="section-head"><div><p class="eyebrow">TECHNIQUES</p><h3>功法谱</h3><p>契合由灵根、道途、悟性、天赋、世界与当前状态共同决定。</p></div></div><div class="technique-grid"><article v-for="technique in game.techniqueCatalog" :key="technique.id" :class="{ active: game.player.activeTechnique === technique.id }"><header><span>{{ technique.grade }}</span><b>《{{ technique.name }}》</b><em>{{ affinity(technique).grade }} {{ affinity(technique).total }}</em></header><p>{{ technique.description }}</p><small>{{ technique.elements.map(entry => entry.element).join('·') || '无特定灵根' }} · 上限 Lv.{{ affinity(technique).maxTechniqueLevel }} · 风险 {{ Math.round(affinity(technique).riskModifier * 100) }}%</small><button v-if="!game.player.knownTechniques.includes(technique.id)" :disabled="!affinity(technique).meetsMinimum" @click="game.learnTechnique(technique.id)">参悟</button><button v-else-if="game.player.activeTechnique !== technique.id" @click="game.selectTechnique(technique.id)">设为主修</button><button v-else @click="game.selectTechnique()">停止主修</button></article></div></section>
  </div>
</template>

<style scoped>
.focus-copy{min-width:260px;flex:1}.focus-details{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:10px 20px;margin:0}.focus-details div{padding:10px 12px;border-left:2px solid rgba(200,164,91,.35)}.focus-details dt,.resource-grid span{font-size:.78rem;color:var(--muted)}.focus-details dd{margin:4px 0 0}.action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.action-card{display:flex;flex-direction:column;padding:16px;border:1px solid rgba(200,164,91,.24);background:rgba(14,20,18,.34)}.action-card header{display:flex;gap:12px;align-items:flex-start}.action-card header>span{display:grid;place-items:center;width:42px;height:42px;border:1px solid #a98545;border-radius:50%;color:#e0bd70;font-family:serif;font-size:1.15rem}.action-card h4{margin:0 0 5px}.action-card p{margin:0;color:var(--muted);font-size:.86rem;line-height:1.55}.duration-options{display:flex;gap:6px;margin:16px 0 10px}.duration-options button{flex:1;padding:6px;background:transparent;border:1px solid rgba(200,164,91,.25);color:var(--muted)}.duration-options button.active{border-color:#d4ae62;color:#f2d18b;background:rgba(187,139,51,.14)}.action-submit{width:100%;margin-top:auto}.action-warning,.missing{color:#d99a7c}.resource-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.resource-grid div{padding:12px;text-align:center;border:1px solid rgba(200,164,91,.18)}.resource-grid b{display:block;margin-top:5px;color:#e2c178;font-size:1.2rem}.cultivation-logs ol{list-style:none;margin:0;padding:0}.cultivation-logs li{display:grid;grid-template-columns:110px 1fr;gap:16px;padding:12px 0;border-bottom:1px solid rgba(200,164,91,.14)}.cultivation-logs time{color:#c9a55d}.cultivation-logs p{margin:4px 0 0;color:var(--muted)}
@media(max-width:900px){.action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.focus-details{grid-template-columns:1fr}.resource-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.action-grid{grid-template-columns:1fr}.resource-grid{grid-template-columns:repeat(2,1fr)}.cultivation-logs li{grid-template-columns:1fr;gap:4px}}
.breakthrough-copy{flex:1}.chance-breakdown{display:grid;grid-template-columns:repeat(5,minmax(86px,1fr));gap:7px;margin:10px 0}.chance-breakdown span{padding:8px;border:1px solid rgba(200,164,91,.16);color:var(--muted);font-size:.78rem}.chance-breakdown b{display:block;margin-top:3px;color:#e2c178}.breakthrough-options{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:12px}.breakthrough-options label{cursor:pointer;color:var(--muted);font-size:.86rem}.aid-note{margin:8px 0 0;color:#bcae91;font-size:.82rem}.breakthrough-attempt{min-width:120px;text-align:center}.breakthrough-attempt small{display:block;color:var(--muted)}.breakthrough-attempt strong{display:block;margin:4px 0 10px;color:#e6c575;font-size:2rem}
</style>
