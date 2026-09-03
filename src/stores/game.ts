import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough, checkBreakthroughRequirements, consumeBreakthroughResources } from '../core/breakthrough/breakthrough'
import { createPlayerFromBuild, generateDescendant } from '../core/creation/creation'
import { calculateCultivationGain } from '../core/cultivation/cultivation'
import { selectEventOutcome } from '../core/events/outcomes'
import { agingStage, calculateMaxLifespanMonths, isNaturalLifespanExpired, isSoulDispersed } from '../core/lifespan/lifespan'
import { rollLoot } from '../core/loot/loot'
import { addPathExperience, addSecondaryPath, applyPathTraining, burnLifespanForCultivation, choosePrimaryPath as choosePath, initialPathResources, pathProgress } from '../core/paths/paths'
import { random } from '../core/random/RandomService'
import { applyFatePurchase, calculateReincarnationPoints, canPurchaseFate, createLifeRecord, defaultSelections, type FatePurchase, initialReincarnation } from '../core/reincarnation/reincarnation'
import { CURRENT_SAVE_VERSION, migrateSave } from '../core/save/serialization'
import { SaveService } from '../core/save/SaveService'
import { modifyStatValue } from '../core/stats/stats'
import { addMonths } from '../core/time/time'
import { createWorld, generateContinent, getWorldModifier, simulateWorld } from '../core/world/world'
import { eventById, GAME_EVENTS } from '../data/events'
import { itemById } from '../data/items'
import { QUALITY_ORDER } from '../data/lootTables'
import { isMajorBreakthrough, REALMS, realmName } from '../data/realms'
import { TALENTS } from '../data/talents'
import { CULTIVATION_PATHS } from '../data/cultivationPaths'
import { WORLD_TRAITS } from '../data/worldTraits'
import { acquireSpiritRoot, createSpiritualAptitude, growElement, purifySpiritRoot, stabilizeSpiritRoot } from '../core/aptitude/aptitude'
import { canUnlockAcquiredTalent, checkAcquiredTalentUnlocks } from '../core/talents/acquiredTalents'
import { calculateTechniqueAffinity, practiceTechnique } from '../core/techniques/techniques'
import { ACQUIRED_TALENTS, acquiredTalentById } from '../data/acquiredTalents'
import { TECHNIQUES, techniqueById } from '../data/techniques'
import { lifeEventById } from '../core/lifeEvents/event'
import { checkLifeEvents, selectLifeEvent } from '../core/lifeEvents/eventResolver'
import { resolveLifeEventChoice } from '../core/lifeEvents/eventOutcome'
import { addFateTag, addLifeTimelineEntry, createLifeTimelineEntry, recordLifeEvent, removeFateTag } from '../core/lifeEvents/eventHistory'
import { evaluateFatePaths } from '../core/lifeEvents/fatePath'
import { createCultivationLog, resolveCultivationAction } from '../core/actions/actionResolver'
import { CULTIVATION_ACTIONS } from '../core/actions/action'
import { addCharacterState, initialCultivationResources, normalizeCharacterStates, removeCharacterState } from '../core/actions/actionEffects'
import { BodyRealm, CharacterState, CultivationAction, type ActionResultType, type CharacterBuild, type CultivationPathId, type EventEffect, type FamilyState, type GameSave, type InventoryItem, type LifeEventEffect, type LifeTimelineEntry, type LogEntry, type Player, type SpiritElement, type StatKey, type TimelineEvent, type WorldEraId, type WorldStrengthLevel } from '../models'

function emptySave(): GameSave {
  const now = new Date().toISOString()
  return {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: now, updatedAt: now, player: null, world: createWorld(), lifeRecords: [],
    reincarnation: initialReincarnation(), settings: { fortunateMode: true, autoSave: true, logLimit: 120 },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null, pendingLifeEvent: null, currentAction: null,
  }
}

export function mergeInventory(target: InventoryItem[], source: InventoryItem[]) {
  for (const item of source) {
    const current = target.find((entry) => entry.itemId === item.itemId)
    if (current) current.quantity += item.quantity
    else target.push({ ...item })
  }
}

export function transferInventory(source: InventoryItem[], target: InventoryItem[]) {
  mergeInventory(target, source.map((item) => ({ ...item })))
  source.splice(0, source.length)
}

export const useGameStore = defineStore('game', () => {
  const state = reactive<GameSave>(emptySave())
  const ready = reactive({ loaded: false, saving: false, lastSaved: '', debugSecret: '', eventResultTitle: '', eventResultText: '' })
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const player = computed(() => state.player)
  const currentRealm = computed(() => state.player ? REALMS[state.player.realmIndex] : REALMS[0])
  const breakthroughChance = computed(() => state.player ? calculateBreakthroughChance(state.player, state.world) : null)
  const breakthroughRequirements = computed(() => state.player ? checkBreakthroughRequirements(state.player) : null)
  const pendingEvent = computed(() => state.pendingEvent ? eventById(state.pendingEvent.eventId) : undefined)
  const pendingLifeEvent = computed(() => state.pendingLifeEvent ? lifeEventById(state.pendingLifeEvent.eventId) : undefined)
  const ageYears = computed(() => Math.floor((state.player?.ageMonths ?? 0) / 12))
  const remainingYears = computed(() => Math.max(0, Math.ceil(((state.player?.lifespanMonths ?? 0) - (state.player?.ageMonths ?? 0)) / 12)))
  const agingStatus = computed(() => state.player ? agingStage(state.player) : '壮年')
  const canBecomeGhost = computed(() => Boolean(state.player && !state.player.alive && state.player.primaryPath !== 'ghost'))
  const eligibleDescendants = computed(() => state.world.descendants.filter((descendant) => descendant.alive && !descendant.isPlayer && descendant.ageMonths >= 16 * 12 && descendant.parents.includes(state.player?.id ?? '')))
  const isFirstGeneration = computed(() => state.lifeRecords.length === 0)

  function replaceState(save: GameSave) { Object.assign(state, migrateSave(structuredClone(save))) }
  function timeline(text: string, type: TimelineEvent['type'] = 'life') {
    const entry: LogEntry = { id: crypto.randomUUID(), year: state.world.currentYear, month: state.world.currentMonth, text, type }
    state.logs.unshift(entry)
    state.logs.splice(state.settings.logLimit)
    if (state.player) state.player.timeline.push({ year: entry.year, month: entry.month, text, type })
  }
  function recordLifeMoment(text: string, type: LifeTimelineEntry['type'], importance: LifeTimelineEntry['importance']) {
    if (!state.player) return
    addLifeTimelineEntry(state.player, createLifeTimelineEntry(state.player, state.world.currentYear, state.world.currentMonth, text, type, importance))
  }
  function refreshFatePaths() {
    if (!state.player) return []
    const completed = evaluateFatePaths(state.player, state.world.currentYear)
    for (const path of completed) {
      timeline(`命运线「${path.name}」已然成形。`, 'realm')
      recordLifeMoment(`铸成命运线「${path.name}」。`, 'fate', 4)
    }
    return completed
  }
  function scheduleSave() {
    if (!state.settings.autoSave) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void manualSave(), 180)
  }
  async function manualSave() {
    ready.saving = true
    await SaveService.save(state)
    ready.saving = false
    ready.lastSaved = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  async function initialize() {
    try {
      const saved = await SaveService.load()
      if (saved) replaceState(saved)
    } finally { ready.loaded = true }
  }

  function createFamily(current: Player): FamilyState {
    return {
      id: current.familyId, name: current.bloodline.familyName, founderId: current.id, foundedYear: state.world.currentYear,
      wealth: 0, inventory: [], reputation: 0, bloodline: current.bloodline, memberIds: [current.id],
    }
  }

  function createCharacter(build: CharacterBuild) {
    if (state.player?.alive) return
    const first = state.lifeRecords.length === 0
    const generation = state.lifeRecords.length + 1
    const predecessor = state.lifeRecords[0]?.playerName
    const familyId = crypto.randomUUID()
    const familyName = `${(build.name.trim() || '无名').slice(0, 1)}氏`
    const entryType = first ? 'initial' : 'reincarnation'
    const created = createPlayerFromBuild(build, generation, state.world.currentYear, entryType, familyId, familyName, random, state.reincarnation.selections.statCapBonus, state.reincarnation.selections.carryMemory ? predecessor : undefined)
    state.player = created
    state.world.families.push(createFamily(created))
    state.reincarnation.selections = defaultSelections()
    state.reincarnation.inHall = false
    state.pendingEvent = null
    state.pendingLifeEvent = null
    ready.eventResultTitle = ''
    ready.eventResultText = ''
    timeline(`${created.name}生于${created.origin.name}，十六岁踏上寻仙路。`, 'life')
    timeline(`自择${created.spiritRoot.name}，天赋为${created.talents.map((entry) => entry.name).join('、') || '平平无奇'}。`, 'life')
    if (created.originSecret) timeline('身世一栏只留有三个墨字：？？？', 'event')
    recordLifeMoment('十六岁踏入修仙，开始寻觅长生大道。', 'begin', 3)
    refreshFatePaths()
    scheduleSave()
  }

  function regenerateWorld(seed?: string) {
    if (state.player || state.lifeRecords.length) return false
    const replacement = createWorld(seed)
    state.world = replacement
    scheduleSave()
    return true
  }

  function checkDeath() {
    if (!state.player?.alive) return true
    if (isSoulDispersed(state.player)) { die('魂体稳定耗尽，魂飞魄散'); return true }
    if (isNaturalLifespanExpired(state.player)) { die('寿元耗尽'); return true }
    return false
  }

  function modifyStat(stat: StatKey, delta: number, reason: string, allowBeyondPotential = false) {
    const current = state.player
    if (!current?.alive) return 0
    if (stat === 'constitution' && delta < 0 && current.acquiredTalents.some((talent) => talent.talentId === 'battle-body')) delta = Math.min(-1, Math.ceil(delta * .65))
    const result = modifyStatValue(current.stats, current.statPotential, stat, delta, allowBeyondPotential)
    if (!result.appliedDelta) return 0
    current.statHistory.push({ year: state.world.currentYear, month: state.world.currentMonth, stat, delta: result.appliedDelta, reason, exceededPotential: result.exceededPotential })
    const label = stat === 'comprehension' ? '悟性' : stat === 'luck' ? '气运' : stat === 'constitution' ? '体魄' : stat === 'soul' ? '神识' : '魅力'
    timeline(`${reason}：${label} ${result.appliedDelta > 0 ? '+' : ''}${result.appliedDelta}。`, 'event')
    scheduleSave()
    return result.appliedDelta
  }

  function maybeGenerateDescendant(months: number) {
    const current = state.player
    if (!current?.alive || current.ageMonths < 30 * 12 || current.ageMonths > 160 * 12) return
    const existing = state.world.descendants.filter((descendant) => descendant.parents.includes(current.id)).length
    if (existing >= 3 || !random.chance(Math.min(.35, months / 500))) return
    const descendant = generateDescendant(current, state.world.currentYear, random)
    descendant.ageMonths = 0
    descendant.birthYear = state.world.currentYear
    state.world.descendants.push(descendant)
    const family = state.world.families.find((entry) => entry.id === current.familyId)
    family?.memberIds.push(descendant.id)
    timeline(`家中传来喜讯，血脉后人「${descendant.name}」降生。`, 'life')
  }

  function advanceTime(months: number) {
    if (!state.player?.alive) return
    const ageBefore = Math.floor(state.player.ageMonths / 12)
    simulateWorld(state.world, months, random)
    addMonths(state.world, months)
    state.player.ageMonths += months
    const ageAfter = Math.floor(state.player.ageMonths / 12)
    if (state.player.primaryPath === 'ghost') {
      state.player.soulStability = Math.max(0, (state.player.soulStability ?? 80) - months / 18)
    } else {
      for (let threshold = Math.max(60, Math.floor(ageBefore / 10 + 1) * 10); threshold <= ageAfter; threshold += 10) {
        modifyStat('constitution', agingStage(state.player) === '暮年' ? -2 : -1, `${threshold}岁时肉身渐衰`)
        if (threshold % 20 === 0) modifyStat('charm', -1, `${threshold}岁时容颜老去`)
      }
    }
    state.player.pathResources.bloodRiteMonthsRemaining = Math.max(0, state.player.pathResources.bloodRiteMonthsRemaining - months)
    maybeGenerateDescendant(months)
    checkDeath()
    if (state.player?.alive) refreshFatePaths()
    if (state.player?.alive && ageAfter > ageBefore && !state.pendingEvent && !state.pendingLifeEvent) {
      const yearlyChance = Math.min(.62, 1 - Math.pow(.84, ageAfter - ageBefore))
      if (random.chance(yearlyChance)) triggerLifeEvent()
    }
  }

  function lifeEventPool() {
    return state.player ? checkLifeEvents(state.player, state.world) : []
  }

  function triggerLifeEvent(eventId?: string) {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent) return false
    const forced = eventId ? lifeEventById(eventId) : undefined
    const selected = forced ?? selectLifeEvent(lifeEventPool(), random)
    if (!selected) return false
    state.pendingLifeEvent = { eventId: selected.id }
    scheduleSave()
    return true
  }

  function advanceYear(action: CultivationAction, years?: number, forcedResult?: ActionResultType) {
    const current = state.player
    if (!current?.alive || state.pendingEvent || state.pendingLifeEvent || state.currentAction) return undefined
    const definition = CULTIVATION_ACTIONS.find((entry) => entry.id === action)!
    const durationYears = definition.durationOptions.includes(years ?? definition.defaultDuration) ? years ?? definition.defaultDuration : definition.defaultDuration
    state.currentAction = { action, startedYear: state.world.currentYear, durationYears }
    const result = resolveCultivationAction(current, state.world, action, random, durationYears, { forcedResult })
    for (const [stat, delta] of Object.entries(result.statChanges) as [StatKey, number][]) if (delta) modifyStat(stat, delta, `${definition.name}所得`)
    if (result.fateTag) addFateTag(current, { ...result.fateTag, createdAt: state.world.currentYear })
    const log = createCultivationLog(result, state.world.currentYear, state.world.currentMonth)
    current.cultivationLogs.unshift(log)
    current.cultivationLogs.splice(200)
    timeline(`${result.title}：${result.summary}`, result.resultType === 'danger' || result.resultType === 'inner-demon' ? 'event' : 'life')
    advanceTime(result.years * 12)
    if (current.alive) {
      const insightEvent = action === CultivationAction.ENLIGHTENMENT
        ? current.spiritualAptitude.innateRoot.elements.length === 5 ? 'five-unity-insight' : current.primaryPath === 'sword' ? 'sword-heart-insight' : current.primaryPath === 'demonic' ? 'demon-heart-trial' : undefined
        : undefined
      unlockAcquiredTalents(insightEvent)
      refreshFatePaths()
      if (!state.pendingEvent && !state.pendingLifeEvent && random.chance(result.lifeEventChance)) triggerLifeEvent()
    }
    state.currentAction = null
    scheduleSave()
    return result
  }

  function cultivate(months: number) {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent) return
    const active = state.player.activeTechnique ? techniqueById(state.player.activeTechnique) : undefined
    const gain = calculateCultivationGain(state.player, months, state.world)
    state.player.cultivation += gain
    if (active) {
      practiceTechnique(state.player, active, months, state.world)
      for (const requirement of active.elements) growElement(state.player.spiritualAptitude, requirement.element, Math.max(1, Math.round(months * requirement.weight)))
      for (const effect of active.effects) {
        if (effect.type === 'demonicNature') { const relief = state.player.acquiredTalents.some((talent) => talent.talentId === 'demon-heart') ? .55 : 1; state.player.pathResources.demonicNature = Math.min(100, state.player.pathResources.demonicNature + Math.max(1, Math.round(months / 12))); state.player.pathResources.karma = Math.min(100, state.player.pathResources.karma + Math.max(1, Math.round(months / 18))); state.player.pathResources.innerDemon = Math.min(100, state.player.pathResources.innerDemon + Math.max(1, Math.round(months / 24 * relief))) }
        if (effect.type === 'soulStability' && state.player.primaryPath === 'ghost') state.player.soulStability = Math.min(100, (state.player.soulStability ?? 0) + months * effect.value)
      }
      if (months >= 120) for (const requirement of active.elements) {
        if (state.player.spiritualAptitude.acquiredRoots.some((root) => root.element === requirement.element)) {
          purifySpiritRoot(state.player.spiritualAptitude, requirement.element, 1)
          stabilizeSpiritRoot(state.player.spiritualAptitude, requirement.element, 1 + Math.floor(state.player.stats.soul / 80))
        }
      }
    }
    const pathResult = applyPathTraining(state.player, months, state.world)
    if (state.player.primaryPath === 'body') state.player.lifespanMonths = calculateMaxLifespanMonths(state.player)
    if (pathResult.statGrowth?.constitution) modifyStat('constitution', pathResult.statGrowth.constitution, '炼体淬炼肉身')
    if (pathResult.statGrowth?.soul) modifyStat('soul', pathResult.statGrowth.soul, '鬼道温养神魂')
    advanceTime(months)
    if (!state.player.alive) return
    timeline(`${months >= 36 ? '闭关' : '修炼'}${months}个月，修为 +${gain.toLocaleString()}${pathResult.resourceText ? `，${pathResult.resourceText}` : ''}。`, 'life')
    const talentEventBonus = state.player.talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'eventWeight').reduce((sum, effect) => sum + effect.value, 0)
    const originBonus = state.player.origin.modifiers.filter((modifier) => modifier.type === 'hiddenEvent').reduce((sum, modifier) => sum + modifier.value, 0)
    const acquiredEventBonus = state.player.acquiredTalents.some((talent) => talent.talentId === 'heaven-chosen') ? .12 : state.player.acquiredTalents.some((talent) => talent.talentId === 'nine-lives') ? .03 : 0
    const eventChance = Math.min(.92, (.16 + Math.log2(months + 1) * .12 + talentEventBonus + acquiredEventBonus + originBonus * .1) * state.world.continent.cultivationEnvironment.eventFrequencyMultiplier)
    if (random.chance(eventChance)) triggerRandomEvent()
    scheduleSave()
  }

  function triggerRandomEvent() {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent) return
    const eligible = GAME_EVENTS.filter((event) => (event.minRealmIndex ?? 0) <= state.player!.realmIndex && (!event.pathRequirements?.length || event.pathRequirements.includes(state.player!.primaryPath!)))
    const chosen = random.weightedRandom(eligible.map((event) => {
      const pathId = state.player!.primaryPath
      const pathWeight = pathId ? event.pathWeights?.[pathId] ?? 1 : 1
      const worldPathEvent = pathId ? getWorldModifier(state.world, 'pathEvent', pathId) : 0
      const gatedTalent = event.id === 'five-unity-insight' ? 'five-unity' : event.id === 'sword-heart-insight' ? 'sword-heart' : event.id === 'demon-heart-trial' ? 'demon-heart' : event.id === 'mandate-revelation' ? 'heaven-chosen' : undefined
      const insightWeight = gatedTalent ? canUnlockAcquiredTalent(state.player!, acquiredTalentById(gatedTalent)!, event.id) ? 8 : .03 : 1
      return { value: event, weight: event.weight * pathWeight * (1 + worldPathEvent) * insightWeight }
    }))
    state.pendingEvent = { eventId: chosen.id }
    scheduleSave()
  }

  function addItem(itemId: string, quantity = 1) {
    if (!state.player) return
    mergeInventory(state.player.inventory, [{ itemId, quantity }])
  }

  function applyEffect(effect: EventEffect, eventId: string) {
    const current = state.player
    if (!current) return
    let value = effect.value ?? 0
    if (eventId === 'market' && effect.type === 'stones') value = Math.round(value * (1 + current.origin.modifiers.filter((modifier) => modifier.type === 'marketReward').reduce((sum, modifier) => sum + modifier.value, 0)))
    if (effect.type === 'stones') current.spiritStones = Math.max(0, current.spiritStones + value)
    if (effect.type === 'cultivation') current.cultivation += value
    if (effect.type === 'lifespan') { if (value > 0 && current.acquiredTalents.some((talent) => talent.talentId === 'defy-fate')) value = Math.round(value * 1.12); current.lifespanBonusMonths += value; current.lifespanMonths = calculateMaxLifespanMonths(current) }
    if (effect.type === 'stat' && effect.stat) {
      modifyStat(effect.stat, value, effect.text)
      if (effect.stat === 'constitution' && value <= -2) current.severeInjuryCount++
      return
    }
    if (effect.type === 'item' && effect.itemId) addItem(effect.itemId)
    if (effect.type === 'pathExperience' && effect.pathId) addPathExperience(current, effect.pathId, value, current.primaryPath !== effect.pathId)
    if (effect.type === 'pathResource' && effect.resource) {
      current.pathResources[effect.resource] = Math.max(0, current.pathResources[effect.resource] + value)
      if (effect.resource === 'qiBlood') current.pathResources.qiBlood = Math.min(current.pathResources.maxQiBlood, current.pathResources.qiBlood)
    }
    if (effect.type === 'unlockPath' && effect.pathId && !current.unlockedPaths.includes(effect.pathId)) current.unlockedPaths.push(effect.pathId)
    if (effect.type === 'soulStability') current.soulStability = Math.max(0, Math.min(100, (current.soulStability ?? 0) + value))
    if (effect.type === 'acquireRoot' && effect.element) acquireSpiritRoot(current.spiritualAptitude, effect.element, effect.purity ?? 50, effect.stability ?? 50, effect.source ?? effect.text, state.world.currentYear, state.world.currentMonth)
    if (effect.type === 'purifyRoot') {
      const target = effect.element ?? current.spiritualAptitude.acquiredRoots[0]?.element
      if (target) purifySpiritRoot(current.spiritualAptitude, target, value)
    }
    if (effect.type === 'stabilizeRoot') {
      const target = effect.element ?? current.spiritualAptitude.acquiredRoots[0]?.element
      if (target) stabilizeSpiritRoot(current.spiritualAptitude, target, value)
    }
    if (effect.type === 'elementalGrowth' && effect.element) growElement(current.spiritualAptitude, effect.element, value)
    if (effect.type === 'acquiredTalent' && effect.talentId && !current.acquiredTalents.some((talent) => talent.talentId === effect.talentId)) {
      const definition = acquiredTalentById(effect.talentId)
      if (definition) current.acquiredTalents.push({ talentId: definition.id, name: definition.name, acquiredYear: state.world.currentYear, acquiredMonth: state.world.currentMonth, source: effect.source ?? eventId })
    }
    if (effect.type === 'death') die(effect.text)
    timeline(effect.text, effect.type === 'item' ? 'loot' : 'event')
  }

  function unlockAcquiredTalents(eventId?: string) {
    const current = state.player
    if (!current) return []
    const unlocked = checkAcquiredTalentUnlocks(current, state.world.currentYear, state.world.currentMonth, eventId)
    for (const talent of unlocked) {
      if (talent.talentId === 'battle-body') current.statPotential.constitution += 8
      timeline(`━━━━━━━━━━━━━━ 后天天赋觉醒 【${talent.name}】 ━━━━━━━━━━━━━━`, 'realm')
      recordLifeMoment(`觉醒后天天赋【${talent.name}】。`, 'talent', 3)
    }
    if (unlocked.length) refreshFatePaths()
    return unlocked
  }

  function learnTechnique(techniqueId: string) {
    const current = state.player
    const technique = techniqueById(techniqueId)
    if (!current?.alive || !technique || current.knownTechniques.includes(techniqueId)) return false
    if (!calculateTechniqueAffinity(current, technique, state.world).meetsMinimum) return false
    current.knownTechniques.push(techniqueId)
    timeline(`参悟功法《${technique.name}》，已可选择修炼。`, 'life')
    scheduleSave()
    return true
  }

  function selectTechnique(techniqueId?: string) {
    const current = state.player
    if (!current?.alive || (techniqueId && !current.knownTechniques.includes(techniqueId))) return false
    current.activeTechnique = techniqueId
    if (techniqueId) timeline(`改修《${techniqueById(techniqueId)?.name ?? techniqueId}》。`, 'life')
    scheduleSave()
    return true
  }

  function improveAcquiredRoot(element: SpiritElement, mode: 'purify' | 'stabilize') {
    const current = state.player
    if (!current?.alive || current.spiritStones < 12) return false
    const applied = mode === 'purify' ? purifySpiritRoot(current.spiritualAptitude, element, 2) : stabilizeSpiritRoot(current.spiritualAptitude, element, 3)
    if (!applied) return false
    current.spiritStones -= 12
    timeline(`${element}灵根${mode === 'purify' ? '纯度' : '稳定性'}提升 ${applied} 点。`, 'event')
    unlockAcquiredTalents()
    scheduleSave()
    return true
  }

  function selectPrimaryPath(pathId: CultivationPathId) {
    const current = state.player
    if (!current || !choosePath(current, pathId)) return false
    timeline(`${current.name}立下道心，以${CULTIVATION_PATHS.find((path) => path.id === pathId)?.name}为此世主道。`, 'realm')
    current.lifespanMonths = calculateMaxLifespanMonths(current)
    unlockAcquiredTalents()
    refreshFatePaths()
    scheduleSave()
    return true
  }

  function selectSecondaryPath(pathId: CultivationPathId) {
    if (!state.player || !addSecondaryPath(state.player, pathId)) return false
    timeline(`兼修${CULTIVATION_PATHS.find((path) => path.id === pathId)?.name}，副道所得有所折减。`, 'realm')
    scheduleSave()
    return true
  }

  function pathPractice() {
    const current = state.player
    if (!current?.alive || !current.primaryPath || state.pendingEvent || state.pendingLifeEvent) return
    const result = applyPathTraining(current, 3, state.world)
    if (current.primaryPath === 'sword' && current.acquiredTalents.some((talent) => talent.talentId === 'sword-heart')) addPathExperience(current, 'sword', 2)
    if (current.primaryPath === 'body') current.lifespanMonths = calculateMaxLifespanMonths(current)
    if (result.statGrowth?.constitution) modifyStat('constitution', result.statGrowth.constitution, '专修肉身')
    if (result.statGrowth?.soul) modifyStat('soul', result.statGrowth.soul, '温养魂体')
    advanceTime(3)
    if (current.alive) timeline(`专修${CULTIVATION_PATHS.find((path) => path.id === current.primaryPath)?.name}三月，${result.resourceText || `道途经验 +${result.experience}`}。`, 'life')
    unlockAcquiredTalents()
    refreshFatePaths()
    scheduleSave()
  }

  function bloodRite() {
    if (!state.player || !burnLifespanForCultivation(state.player)) return false
    timeline('施展血炼术，以五年寿元换取未来十年的修炼加速，心魔与业力随之增长。', 'event')
    scheduleSave()
    return true
  }

  function chooseEvent(optionId: string) {
    const event = pendingEvent.value
    const option = event?.options.find((entry) => entry.id === optionId)
    if (!event || !option || !state.player) return
    timeline(`奇遇「${event.title}」：${option.label}。`, 'event')
    const outcome = selectEventOutcome(option.outcomes, state.player, random, state.world)
    for (const effect of outcome.effects) applyEffect(effect, event.id)
    if (outcome.tags?.includes('rare')) { state.reincarnation.rareEventCount++; state.player.rareEventCount++ }
    if (outcome.tags?.includes('danger')) {
      state.player.dangerousEventCount++
      if (state.player.alive && outcome.effects.some((effect) => effect.type === 'stat' && (effect.value ?? 0) <= -2)) state.player.nearDeathCount++
      for (const root of state.player.spiritualAptitude.acquiredRoots) if (root.stability < 30 && random.chance((30 - root.stability) / 100)) { root.purity = Math.max(1, root.purity - 1); root.stability = Math.max(0, root.stability - 2) }
      state.player.luckyOutcomeStreak = 0
    }
    else if (outcome.tags?.includes('rare')) state.player.luckyOutcomeStreak++
    else state.player.luckyOutcomeStreak = 0
    unlockAcquiredTalents(event.id)
    ready.eventResultTitle = event.title
    ready.eventResultText = outcome.resultText
    state.pendingEvent = null
    scheduleSave()
  }

  function applyLifeEventEffect(effect: LifeEventEffect, eventId: string) {
    const current = state.player
    if (!current) return
    const amount = typeof effect.value === 'number' ? effect.value : Number(effect.value) || 0
    if (effect.type === 'ADD_STAT' && effect.stat) modifyStat(effect.stat, amount, effect.text ?? `人生事件「${eventId}」`)
    if (effect.type === 'ADD_CULTIVATION') current.cultivation = Math.max(0, current.cultivation + amount)
    if (effect.type === 'ADD_STONES') current.spiritStones = Math.max(0, current.spiritStones + amount)
    if (effect.type === 'LEARN_TECHNIQUE') {
      const techniqueId = String(effect.value)
      const technique = techniqueById(techniqueId)
      if (technique && !current.knownTechniques.includes(techniqueId)) {
        current.knownTechniques.push(techniqueId)
        timeline(`因机缘获得功法《${technique.name}》。`, 'realm')
        if (!current.lifeTimeline.some((entry) => entry.type === 'inheritance')) recordLifeMoment(`第一次获得传承《${technique.name}》。`, 'inheritance', 3)
      }
    }
    if (effect.type === 'ACQUIRE_ROOT') {
      const element = effect.element ?? String(effect.value) as SpiritElement
      acquireSpiritRoot(current.spiritualAptitude, element, effect.purity ?? 48, effect.stability ?? 52, effect.text ?? eventId, state.world.currentYear, state.world.currentMonth)
    }
    if (effect.type === 'TRIGGER_TALENT') {
      const talentId = String(effect.value)
      const definition = acquiredTalentById(talentId)
      if (definition && !current.acquiredTalents.some((entry) => entry.talentId === talentId)) {
        current.acquiredTalents.push({ talentId, name: definition.name, acquiredYear: state.world.currentYear, acquiredMonth: state.world.currentMonth, source: eventId })
        timeline(`后天天赋觉醒【${definition.name}】。`, 'realm')
        recordLifeMoment(`觉醒后天天赋【${definition.name}】。`, 'talent', 3)
      }
    }
    if (effect.type === 'ADD_FATE_TAG') addFateTag(current, { id: String(effect.value), name: effect.text ?? String(effect.value), description: `由人生事件「${eventId}」留下的因果。`, createdAt: state.world.currentYear })
    if (effect.type === 'REMOVE_FATE_TAG') removeFateTag(current, String(effect.value))
    if (effect.type === 'ADD_TIMELINE') recordLifeMoment(effect.text ?? String(effect.value), 'event', 3)
    if (effect.type === 'ADD_PATH_RESOURCE' && effect.pathResource) {
      current.pathResources[effect.pathResource] = Math.max(0, current.pathResources[effect.pathResource] + amount)
    }
  }

  function chooseLifeEvent(choiceId: string) {
    const event = pendingLifeEvent.value
    const current = state.player
    if (!event || !current) return false
    const resolved = resolveLifeEventChoice(event, choiceId, current, state.world)
    if (!resolved) return false
    for (const effect of resolved.choice.effects) applyLifeEventEffect(effect, event.id)
    recordLifeEvent(current, resolved.record)
    recordLifeMoment(`${event.name}：${resolved.choice.label}。${resolved.choice.result}`, 'event', event.importance)
    if (event.tags.includes('danger') && !current.lifeTimeline.some((entry) => entry.type === 'danger')) {
      current.nearDeathCount++
      recordLifeMoment(`在「${event.name}」中第一次直面生死危机。`, 'danger', 3)
    }
    unlockAcquiredTalents(event.id)
    refreshFatePaths()
    ready.eventResultTitle = event.name
    ready.eventResultText = resolved.choice.result
    state.pendingLifeEvent = null
    scheduleSave()
    return true
  }

  function closeEventResult() {
    ready.eventResultTitle = ''
    ready.eventResultText = ''
  }

  function adventure() {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent) return
    advanceTime(3)
    if (!state.player.alive) return
    const loot = rollLoot(state.player, state.pity, state.settings.fortunateMode, random, state.world.continent.cultivationEnvironment.resourceMultiplier)
    state.pity = loot.pity
    addItem(loot.item.id)
    const stones = Math.round((random.randomInt(6, 20) + state.player.realmIndex * 2) * state.world.continent.cultivationEnvironment.resourceMultiplier)
    state.player.spiritStones += stones
    if (QUALITY_ORDER.indexOf(loot.item.quality) >= 3) state.reincarnation.rareLootCount++
    timeline(`历练归来，获得${loot.item.quality}「${loot.item.name}」与 ${stones} 枚灵石。`, 'loot')
    if (random.chance(.32)) triggerRandomEvent()
    scheduleSave()
  }

  function unlockAchievements(current: Player) {
    if (current.achievements.includes('证得金丹') && !state.reincarnation.unlockedTalents.includes('sword')) state.reincarnation.unlockedTalents.push('sword')
    if (current.achievements.includes('证得元婴') && !state.reincarnation.unlockedTalents.includes('dao-body')) state.reincarnation.unlockedTalents.push('dao-body')
  }

  function breakthrough(forceSuccess?: boolean) {
    const current = state.player
    if (!current || state.pendingEvent || state.pendingLifeEvent || !canBreakthrough(current)) return
    const chance = calculateBreakthroughChance(current, state.world).final
    const fromRealm = REALMS[current.realmIndex]
    const targetRealm = REALMS[current.realmIndex + 1]
    const lifespanBefore = current.lifespanMonths
    consumeBreakthroughResources(current)
    let succeeded = false
    let resultText = ''
    advanceTime(1)
    if (!current.alive) return
    if (forceSuccess ?? random.chance(chance)) {
      const firstBreakthrough = !current.lifeTimeline.some((entry) => entry.type === 'realm')
      succeeded = true
      current.realmIndex++
      current.cultivation = Math.max(0, current.cultivation - current.cultivationRequired)
      current.cultivationRequired = REALMS[current.realmIndex].cultivationRequired
      const newRealm = REALMS[current.realmIndex]
      current.breakthroughProgress = 0
      removeCharacterState(current, CharacterState.BOTTLENECK)
      removeCharacterState(current, CharacterState.INJURED)
      normalizeCharacterStates(current)
      resultText = `突破成功，踏入${newRealm.name}。`
      timeline(`破境成功，踏入${newRealm.name}！`, 'realm')
      recordLifeMoment(`突破至${newRealm.name}。`, 'realm', firstBreakthrough || isMajorBreakthrough(current.realmIndex) ? 3 : 2)
      if (isMajorBreakthrough(current.realmIndex)) {
        const wasAtLimit = current.ageMonths >= current.lifespanMonths * .95
        if (current.ageMonths >= current.lifespanMonths * .6) current.lateMajorBreakthroughs++
        current.lifespanMonths = calculateMaxLifespanMonths(current)
        const achievement = `证得${newRealm.group}`
        if (!current.achievements.includes(achievement)) current.achievements.push(achievement)
        unlockAchievements(current)
        modifyStat('constitution', 2, `突破${newRealm.group}，灵气洗炼肉身`)
        modifyStat('soul', 1, `突破${newRealm.group}，神魂随境界增长`)
        for (const root of current.spiritualAptitude.acquiredRoots) { purifySpiritRoot(current.spiritualAptitude, root.element, 1); stabilizeSpiritRoot(current.spiritualAptitude, root.element, 1 + Math.floor(current.stats.soul / 90)) }
        timeline(`肉身得到灵气滋养，生机重新焕发。寿元上限：${Math.floor(lifespanBefore / 12)} → ${Math.floor(current.lifespanMonths / 12)} 年。`, 'realm')
        if (wasAtLimit) {
          current.nearDeathCount++
          if (!current.lifeTimeline.some((entry) => entry.type === 'danger')) recordLifeMoment('在寿元大限前逆势破境，第一次从死亡边缘归来。', 'danger', 3)
          unlockAcquiredTalents('defy-fate-breakthrough')
        }
        unlockAcquiredTalents()
      }
      refreshFatePaths()
    } else {
      current.cultivation = Math.round(current.cultivation * random.randomInt(65, 88) / 100)
      const baseLoss = Math.max(3, current.realmIndex - 6) * random.randomInt(1, 4)
      const bodyResistance = current.primaryPath === 'body' ? .7 : 1
      const demonicRisk = current.primaryPath === 'demonic' ? 1.6 : 1
      const lifespanLoss = Math.round(baseLoss * bodyResistance * demonicRisk)
      current.lifespanBonusMonths -= lifespanLoss
      current.lifespanMonths = calculateMaxLifespanMonths(current)
      if (current.primaryPath === 'demonic') current.pathResources.innerDemon = Math.min(100, current.pathResources.innerDemon + 10)
      current.breakthroughProgress = Math.max(20, current.breakthroughProgress - 38)
      addCharacterState(current, random.chance(.18 + (current.primaryPath === 'demonic' ? .12 : 0)) ? CharacterState.SERIOUS_INJURY : CharacterState.INJURED)
      addCharacterState(current, CharacterState.BOTTLENECK)
      resultText = `突破失败，修为倒退并折损${lifespanLoss}个月寿元。`
      modifyStat('constitution', -1, '破境失败，道基受损')
      if (current.cultivationRequired > 0 && current.cultivation / current.cultivationRequired < .15) current.nearDeathCount++
      timeline(`破境失败，修为倒退，折损${lifespanLoss}个月寿元。`, 'event')
      if (random.chance(Math.max(0, current.realmIndex - 13) * .009)) die('突破失败，道基崩毁')
    }
    current.breakthroughHistory.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, month: state.world.currentMonth, fromRealm: fromRealm.name, toRealm: targetRealm.name, success: succeeded, chance, result: resultText, lifespanBefore, lifespanAfter: current.lifespanMonths })
    current.breakthroughHistory.splice(100)
    scheduleSave()
  }

  function preserveFamilyAssets(current: Player) {
    const family = state.world.families.find((entry) => entry.id === current.familyId)
    if (!family) return
    family.wealth += Math.floor(current.spiritStones * .5)
    mergeInventory(family.inventory, current.inventory.map((item) => ({ itemId: item.itemId, quantity: Math.floor(item.quantity / 2) })).filter((item) => item.quantity > 0))
    family.reputation += current.realmIndex * 2 + current.achievements.length * 5
  }

  function die(cause: string) {
    const current = state.player
    if (!current?.alive) return
    current.alive = false
    current.deathFinalized = false
    current.causeOfDeath = cause
    state.pendingEvent = null
    state.pendingLifeEvent = null
    timeline(`${current.name}${cause}，享年${Math.floor(current.ageMonths / 12)}岁。`, 'death')
    scheduleSave()
  }

  function finalizeMortalDeath(current = state.player) {
    if (!current || current.alive || current.deathFinalized) return false
    refreshFatePaths()
    if (!current.lifeTimeline.some((entry) => entry.type === 'death')) recordLifeMoment(`${current.name}${current.causeOfDeath ?? '命数已尽'}，享年${Math.floor(current.ageMonths / 12)}岁。`, 'death', 4)
    preserveFamilyAssets(current)
    const controlledDescendant = state.world.descendants.find((descendant) => descendant.id === current.id)
    if (controlledDescendant) controlledDescendant.alive = false
    const points = calculateReincarnationPoints(current)
    state.reincarnation.totalPoints += points
    unlockAchievements(current)
    for (const acquired of current.acquiredTalents) {
      const nextLifeTalent = acquiredTalentById(acquired.talentId)?.reincarnationUnlock
      if (nextLifeTalent && !state.reincarnation.unlockedTalents.includes(nextLifeTalent)) state.reincarnation.unlockedTalents.push(nextLifeTalent)
    }
    const fateUnlocks: Record<string, string> = { 'sword-legend': 'sword', 'five-elements-dao': 'five-element-seed', 'defy-destiny': 'late', 'longevity-road': 'longevity' }
    for (const path of current.fatePaths.filter((entry) => entry.status === 'completed')) {
      const talentId = fateUnlocks[path.id]
      if (talentId && !state.reincarnation.unlockedTalents.includes(talentId)) state.reincarnation.unlockedTalents.push(talentId)
    }
    if (!state.lifeRecords.some((record) => record.playerId === current.id)) state.lifeRecords.unshift(createLifeRecord(current, state.world.currentYear, realmName(current.realmIndex), points))
    current.deathFinalized = true
    scheduleSave()
    return true
  }

  function becomeGhost() {
    const current = state.player
    if (!current || current.alive || current.primaryPath === 'ghost') return false
    if (current.deathFinalized) return false
    current.alive = true
    current.deathFinalized = false
    current.causeOfDeath = undefined
    current.unlockedPaths = [...new Set<CultivationPathId>([...current.unlockedPaths, 'ghost'])]
    if (current.primaryPath && !current.secondaryPaths.some((entry) => entry.pathId === current.primaryPath)) {
      const previous = current.pathProgress.find((entry) => entry.pathId === current.primaryPath)
      if (previous) current.secondaryPaths = [{ ...previous }]
    }
    current.primaryPath = 'ghost'
    current.soulStability = 80
    pathProgress(current, 'ghost')
    const controlledDescendant = state.world.descendants.find((descendant) => descendant.id === current.id)
    if (controlledDescendant) { controlledDescendant.alive = true; controlledDescendant.isPlayer = true }
    timeline('肉身虽死，魂魄却拒绝轮回。你以残魂踏上鬼道，往后以魂体稳定维系存在。', 'realm')
    scheduleSave()
    return true
  }

  function continueAsDescendant(id: string) {
    const deceased = state.player
    const descendant = eligibleDescendants.value.find((entry) => entry.id === id)
    if (!deceased || deceased.alive || !descendant) return
    finalizeMortalDeath(deceased)
    const family = state.world.families.find((entry) => entry.id === descendant.familyId)
    descendant.isPlayer = true
    state.player = {
      id: descendant.id, name: descendant.name, generation: state.lifeRecords.length + 1, birthYear: descendant.birthYear,
      ageMonths: descendant.ageMonths, lifespanMonths: descendant.lifespanMonths, realmIndex: descendant.realmIndex,
      cultivation: descendant.cultivation, cultivationRequired: REALMS[descendant.realmIndex].cultivationRequired,
      spiritRoot: { ...descendant.spiritRoot, elements: [...descendant.spiritRoot.elements], mutations: [...descendant.spiritRoot.mutations] }, stats: { ...descendant.stats }, statPotential: { ...descendant.statPotential }, statHistory: [], spiritStones: descendant.spiritStones + Math.floor((family?.wealth ?? 0) * .5),
      inventory: descendant.inventory.map((item) => ({ ...item })), talents: descendant.talents.map((talent) => ({ ...talent, effects: talent.effects.map((effect) => ({ ...effect })) })), talentPoints: descendant.talents.reduce((sum, talent) => sum + talent.cost, 0),
      origin: descendant.origin, familyId: descendant.familyId, bloodline: family?.bloodline ?? deceased.bloodline,
      entryType: 'bloodline', parentId: deceased.id, predecessorName: deceased.name, alive: true, deathFinalized: false, achievements: [], timeline: [],
      secondaryPaths: [], pathProgress: [], pathResources: initialPathResources(), unlockedPaths: ['dao', 'sword', 'body'],
      lifespanFateModifier: 0, lifespanBonusMonths: 0,
      spiritualAptitude: createSpiritualAptitude(descendant.spiritRoot), acquiredTalents: [], knownTechniques: ['plain-breath'], techniqueProgress: [],
      nearDeathCount: 0, dangerousEventCount: 0, severeInjuryCount: 0, luckyOutcomeStreak: 0, rareEventCount: 0, lateMajorBreakthroughs: 0,
      lifeEventHistory: [], fateTags: [], fatePaths: [], lifeTimeline: [], importantEvents: [],
      cultivationLogs: [], resources: initialCultivationResources(), characterStates: [CharacterState.NORMAL], breakthroughHistory: [], breakthroughProgress: 0,
      bodyRealm: BodyRealm.SKIN, bodyTrainingProgress: 0,
    }
    state.player.lifespanMonths = calculateMaxLifespanMonths(state.player)
    if (family) { family.wealth = Math.ceil(family.wealth * .5); transferInventory(family.inventory, state.player.inventory) }
    state.reincarnation.inHall = false
    state.pendingLifeEvent = null
    timeline(`${descendant.name}承接${deceased.name}的血脉与遗志，续写家族因果。`, 'life')
    recordLifeMoment(`${descendant.name}承接前人血脉，开始自己的修行人生。`, 'begin', 3)
    refreshFatePaths()
    scheduleSave()
  }

  function enterReincarnationHall() {
    if (!state.player || state.player.alive) return
    finalizeMortalDeath()
    state.reincarnation.inHall = true
    state.reincarnation.selections = defaultSelections()
    scheduleSave()
  }

  function beginReincarnationCreation() {
    if (!state.reincarnation.inHall || state.player?.alive) return
    const gap = random.randomInt(3, 24) * 12
    simulateWorld(state.world, gap, random)
    addMonths(state.world, gap)
    state.player = null
    scheduleSave()
  }

  function purchaseFate(purchase: FatePurchase) {
    if (applyFatePurchase(state.reincarnation, purchase)) scheduleSave()
  }

  function useItem(itemId: string) {
    const current = state.player
    const stack = current?.inventory.find((entry) => entry.itemId === itemId)
    const definition = itemById(itemId)
    if (!current?.alive || !stack || !definition?.effects?.length) return
    for (const effect of definition.effects) {
      if (effect.type === 'cultivation') current.cultivation += effect.value
      if (effect.type === 'lifespan') current.lifespanMonths += effect.value
      if (effect.type === 'stone') current.spiritStones += effect.value
    }
    stack.quantity--
    if (stack.quantity <= 0) current.inventory = current.inventory.filter((entry) => entry.itemId !== itemId)
    timeline(`服用「${definition.name}」，药力在体内化开。`, 'loot')
    scheduleSave()
  }

  async function resetGame() { await SaveService.remove(); replaceState(emptySave()) }

  type DebugAction = 'cultivation' | 'stones' | 'age' | 'age80' | 'age90' | 'age99' | 'event' | 'lifeEvent' | 'lifeEventPool' | 'addFateTag' | 'removeFateTag' | 'fateProgress' | 'lifeTimeline' | 'jumpAge' | 'death' | 'points' | 'unlockTalents' | 'descendant' | 'adultDescendants' | 'secret' | 'toggleGeneration' | 'hall' | 'pathDao' | 'pathSword' | 'pathBody' | 'pathDemonic' | 'pathGhost' | 'pathExperience' | 'swordIntent' | 'qiBlood' | 'demonicNature' | 'innerDemon' | 'karma' | 'soulStability' | 'majorLifespan' | 'rootTreasure' | 'rootTribulation' | 'rootInheritance' | 'rootBloodline' | 'rootTheft' | 'rootReincarnation' | 'rootPurify' | 'rootStabilize' | 'elementGrowth' | 'elements80' | 'balance90' | 'triggerFiveInsight' | 'grantFiveUnity' | 'checkAcquiredTalents' | 'unlockAcquiredTalents' | 'unlockTechniques' | 'techniqueExperience' | 'techniqueAffinity' | 'nearDeath' | 'breakthroughReady' | 'simulateBreakthrough' | 'addResources' | 'addInjury' | 'addInnerDemonState' | 'forceEnlightenment' | 'forceAdventure'
  function debug(action: DebugAction) {
    if (action === 'points') state.reincarnation.totalPoints += 500
    if (action === 'unlockTalents') state.reincarnation.unlockedTalents = TALENTS.map((talent) => talent.id)
    const current = state.player
    if (!current) { scheduleSave(); return }
    if (action === 'cultivation') current.cultivation += Math.max(1000, current.cultivationRequired)
    if (action === 'stones') current.spiritStones += 1000
    if (action === 'addResources') {
      current.spiritStones += 100
      for (const key of Object.keys(current.resources) as (keyof typeof current.resources)[]) current.resources[key] += 10
    }
    if (action === 'addInjury') addCharacterState(current, CharacterState.INJURED)
    if (action === 'addInnerDemonState') addCharacterState(current, CharacterState.INNER_DEMON)
    if (action === 'forceEnlightenment') advanceYear(CultivationAction.ENLIGHTENMENT, 1, 'insight')
    if (action === 'forceAdventure') advanceYear(CultivationAction.ADVENTURE, 1, 'resource')
    if (action === 'breakthroughReady' || action === 'simulateBreakthrough') {
      current.cultivation = Math.max(current.cultivation, current.cultivationRequired)
      current.breakthroughProgress = 100
      removeCharacterState(current, CharacterState.SERIOUS_INJURY)
      addCharacterState(current, CharacterState.BOTTLENECK)
      const activeId = current.activeTechnique ?? current.knownTechniques[0]
      if (activeId) {
        current.activeTechnique = activeId
        const progress = current.techniqueProgress.find((entry) => entry.techniqueId === activeId) ?? { techniqueId: activeId, experience: 0, level: 1 }
        if (!current.techniqueProgress.includes(progress)) current.techniqueProgress.push(progress)
        progress.level = Math.max(progress.level, checkBreakthroughRequirements(current).requiredTechniqueLevel)
      }
      const cost = checkBreakthroughRequirements(current).resourceCost
      for (const key of Object.keys(cost) as (keyof typeof cost)[]) current.resources[key] = Math.max(current.resources[key], cost[key])
      if (action === 'simulateBreakthrough') breakthrough()
    }
    if (action === 'age') { current.ageMonths = Math.max(current.ageMonths, current.lifespanMonths - 12); timeline('岁月忽然加速，你已至寿元将尽之时。') }
    if (action === 'age80') current.ageMonths = Math.floor(current.lifespanMonths * .8)
    if (action === 'age90') current.ageMonths = Math.floor(current.lifespanMonths * .9)
    if (action === 'age99') current.ageMonths = Math.floor(current.lifespanMonths * .99)
    if (action === 'event') triggerRandomEvent()
    if (action === 'lifeEvent') {
      state.pendingEvent = null
      const pool = lifeEventPool()
      if (pool.length) triggerLifeEvent(selectLifeEvent(pool, random)?.id)
    }
    if (action === 'lifeEventPool') ready.debugSecret = lifeEventPool().map((entry) => `${entry.event.name}（权重 ${entry.weight.toFixed(2)}）`).join('\n') || '当前没有符合条件的人生事件。'
    if (action === 'addFateTag') addFateTag(current, { id: `DEBUG_FATE_${current.fateTags.length + 1}`, name: '调试因果', description: '由 Debug Panel 添加。', createdAt: state.world.currentYear })
    if (action === 'removeFateTag') current.fateTags.pop()
    if (action === 'fateProgress') {
      evaluateFatePaths(current, state.world.currentYear)
      const path = current.fatePaths.find((entry) => entry.status === 'forming')
      if (path) {
        path.progress = Math.min(100, path.progress + 25)
        if (path.progress >= 100) { path.status = 'completed'; path.completedYear = state.world.currentYear; recordLifeMoment(`铸成命运线「${path.name}」。`, 'fate', 4) }
      }
    }
    if (action === 'lifeTimeline') ready.debugSecret = current.lifeTimeline.map((entry) => `${entry.age}岁 · ${entry.text}`).join('\n') || '人生时间线尚为空白。'
    if (action === 'jumpAge') advanceTime(120)
    if (action === 'descendant') { const child = generateDescendant(current, state.world.currentYear, random); state.world.descendants.push(child); state.world.families.find((family) => family.id === current.familyId)?.memberIds.push(child.id) }
    if (action === 'adultDescendants') state.world.descendants.filter((descendant) => descendant.parents.includes(current.id)).forEach((descendant) => { descendant.ageMonths = Math.max(descendant.ageMonths, 18 * 12) })
    if (action === 'secret') ready.debugSecret = current.originSecret ?? '此人并无隐藏身世。'
    if (action === 'toggleGeneration') { current.generation = current.generation === 1 ? 2 : 1; current.entryType = current.generation === 1 ? 'initial' : 'reincarnation' }
    if (action === 'death') die('调试天劫降临')
    if (action === 'hall') { if (current.alive) die('调试轮回召引'); enterReincarnationHall() }
    const debugPath = action === 'pathDao' ? 'dao' : action === 'pathSword' ? 'sword' : action === 'pathBody' ? 'body' : action === 'pathDemonic' ? 'demonic' : action === 'pathGhost' ? 'ghost' : undefined
    if (debugPath) { current.primaryPath = undefined; current.unlockedPaths = [...new Set<CultivationPathId>([...current.unlockedPaths, debugPath])]; choosePath(current, debugPath, true); if (debugPath === 'ghost') current.soulStability = 80 }
    if (action === 'pathExperience' && current.primaryPath) addPathExperience(current, current.primaryPath, 500)
    if (action === 'swordIntent') current.pathResources.swordIntent += 100
    if (action === 'qiBlood') { current.pathResources.maxQiBlood += 100; current.pathResources.qiBlood = current.pathResources.maxQiBlood }
    if (action === 'demonicNature') current.pathResources.demonicNature = Math.min(100, current.pathResources.demonicNature + 20)
    if (action === 'innerDemon') current.pathResources.innerDemon = Math.min(100, current.pathResources.innerDemon + 20)
    if (action === 'karma') current.pathResources.karma = Math.min(100, current.pathResources.karma + 20)
    if (action === 'soulStability') current.soulStability = Math.min(100, (current.soulStability ?? 0) + 20)
    if (action === 'majorLifespan') { current.realmIndex = Math.min(REALMS.length - 1, current.realmIndex < 11 ? 11 : current.realmIndex + (4 - (current.realmIndex - 11) % 4)); current.lifespanMonths = calculateMaxLifespanMonths(current) }
    const debugRoots: Partial<Record<DebugAction, [SpiritElement, string]>> = { rootTreasure: ['土', '天材地宝'], rootTribulation: ['雷', '雷劫淬体'], rootInheritance: ['冰', '秘境传承'], rootBloodline: ['风', '血脉觉醒'], rootTheft: ['暗', '魔道夺灵'], rootReincarnation: ['光', '轮回残留'] }
    if (debugRoots[action]) acquireSpiritRoot(current.spiritualAptitude, debugRoots[action]![0], 70, action === 'rootTheft' ? 25 : 70, debugRoots[action]![1], state.world.currentYear, state.world.currentMonth)
    if (action === 'rootPurify' && current.spiritualAptitude.acquiredRoots[0]) purifySpiritRoot(current.spiritualAptitude, current.spiritualAptitude.acquiredRoots[0].element, 10)
    if (action === 'rootStabilize' && current.spiritualAptitude.acquiredRoots[0]) stabilizeSpiritRoot(current.spiritualAptitude, current.spiritualAptitude.acquiredRoots[0].element, 10)
    if (action === 'elementGrowth') for (const element of current.spiritualAptitude.innateRoot.elements) growElement(current.spiritualAptitude, element, 20)
    if (action === 'elements80') for (const element of ['金', '木', '水', '火', '土'] as SpiritElement[]) current.spiritualAptitude.elementalGrowth[element] = 80
    if (action === 'balance90') { for (const element of ['金', '木', '水', '火', '土'] as SpiritElement[]) current.spiritualAptitude.elementalGrowth[element] = 90; current.spiritualAptitude.elementalGrowth.金 = 100 }
    if (action === 'triggerFiveInsight') state.pendingEvent = { eventId: 'five-unity-insight' }
    if (action === 'grantFiveUnity' && !current.acquiredTalents.some((talent) => talent.talentId === 'five-unity')) current.acquiredTalents.push({ talentId: 'five-unity', name: '五行归一', acquiredYear: state.world.currentYear, acquiredMonth: state.world.currentMonth, source: '调试台' })
    if (action === 'checkAcquiredTalents') unlockAcquiredTalents()
    if (action === 'unlockAcquiredTalents') current.acquiredTalents = ACQUIRED_TALENTS.map((talent) => ({ talentId: talent.id, name: talent.name, acquiredYear: state.world.currentYear, acquiredMonth: state.world.currentMonth, source: '调试台' }))
    if (action === 'unlockTechniques') current.knownTechniques = TECHNIQUES.map((technique) => technique.id)
    if (action === 'techniqueExperience' && current.activeTechnique) practiceTechnique(current, techniqueById(current.activeTechnique)!, 240, state.world)
    if (action === 'techniqueAffinity' && current.activeTechnique) ready.debugSecret = JSON.stringify(calculateTechniqueAffinity(current, techniqueById(current.activeTechnique)!, state.world).breakdown)
    if (action === 'nearDeath') current.nearDeathCount++
    scheduleSave()
  }

  function debugWorld(action: 'regenerate' | 'addTrait' | 'removeTrait' | 'era' | 'strength') {
    if (action === 'regenerate') { state.world.seed = createWorld().seed; state.world.continent = generateContinent(state.world.seed) }
    if (action === 'addTrait') {
      const candidate = WORLD_TRAITS.find((trait) => !state.world.continent.traits.some((entry) => entry.id === trait.id))
      if (candidate) state.world.continent.traits.push(structuredClone(candidate))
    }
    if (action === 'removeTrait') state.world.continent.traits.pop()
    if (action === 'era') {
      const eras: WorldEraId[] = ['DECLINING', 'NORMAL', 'PROSPEROUS', 'GOLDEN']
      state.world.continent.era = eras[(eras.indexOf(state.world.continent.era) + 1) % eras.length]
    }
    if (action === 'strength') {
      const strengths: WorldStrengthLevel[] = ['BARREN', 'COMMON', 'THRIVING', 'POWERFUL', 'SUPREME']
      state.world.continent.strengthLevel = strengths[(strengths.indexOf(state.world.continent.strengthLevel) + 1) % strengths.length]
    }
    scheduleSave()
  }

  return {
    state, ready, player, currentRealm, breakthroughChance, breakthroughRequirements, pendingEvent, pendingLifeEvent, ageYears, remainingYears, agingStatus, canBecomeGhost, eligibleDescendants, isFirstGeneration,
    initialize, createCharacter, cultivate, adventure, advanceYear, breakthrough, chooseEvent, chooseLifeEvent, closeEventResult, triggerRandomEvent, triggerLifeEvent, lifeEventPool, continueAsDescendant,
    enterReincarnationHall, beginReincarnationCreation, purchaseFate, canPurchaseFate: (purchase: FatePurchase) => canPurchaseFate(state.reincarnation, purchase),
    modifyStat, selectPrimaryPath, selectSecondaryPath, pathPractice, bloodRite, becomeGhost, finalizeMortalDeath, regenerateWorld, debugWorld, useItem,
    learnTechnique, selectTechnique, improveAcquiredRoot, techniqueCatalog: TECHNIQUES, actionCatalog: CULTIVATION_ACTIONS, manualSave, resetGame, replaceState, debug,
  }
})
