import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough, checkBreakthroughRequirements, consumeBreakthroughAid, type BreakthroughOptions } from '../core/breakthrough/breakthrough'
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
import { calculateEventRisk, eventDeathCategory, resolveEventRisk, type RiskOutcome } from '../core/lifeEvents/eventRisk'
import { createCultivationLog, resolveCultivationAction } from '../core/actions/actionResolver'
import { CULTIVATION_ACTIONS } from '../core/actions/action'
import { addCharacterState, initialCultivationResources, lifeEventStateMultiplier, normalizeCharacterStates, removeCharacterState } from '../core/actions/actionEffects'
import { BodyRealm, CharacterState, CultivationAction, type ActionResultType, type CharacterBuild, type CultivationPathId, type EventEffect, type FamilyState, type GameSave, type InventoryItem, type LifeEventEffect, type LifeTimelineEntry, type LogEntry, type Player, type RelationshipType, type SpiritElement, type StatKey, type TimelineEvent, type WorldEraId, type WorldStrengthLevel } from '../models'
import { addSectContribution, canAccessSectTechnique, canJoinSect, createSect, joinSect as admitToSect, sectStipend, techniqueContributionCost, updateSectPosition } from '../core/sect/sectManager'
import { sectById } from '../core/sect/sectRepository'
import { changeSectRelation } from '../core/sect/sectRelation'
import { generateNPCCultivator, generateSectCohort, simulateNPCCultivator } from '../core/npc/npcCultivator'
import { relationshipBetween, setRelationship } from '../core/relationships/relationship'
import { inheritFamilyLegacy, promoteCultivationFamily } from '../core/family/family'
import { ARTIFACT_CATALOG, BATTLE_CARD_CATALOG, createCombatEnemy, initialBattleStats } from '../core/combat/combat'
import { calculateCombatPower, calculateNPCCombatPower } from '../core/combat/combatPower'
import { combatStrengthLabel, resolveCombat } from '../core/combat/combatResolver'
import { unlockBattleAchievements } from '../core/combat/combatResult'
import { combatInjuryFromHealth } from '../core/combat/combatPresentation'
import { CombatStrategy, type CombatContext, type CombatEnemyType, type CombatLoot, type CombatOutcome } from '../models'
import { artifactBattleCard, bindArtifact, emptyEquipment, equipItem, nourishBoundArtifact, unequipItem, unbindArtifact } from '../core/items/equipment'
import { decayPillToxicity, recordPill, usePill } from '../core/items/pills'
import { craftItem } from '../core/items/recipes'
import { SECRET_REALMS, secretRealmById } from '../data/secretRealms'
import { canEnterSecretRealm, completeSecretRealmEncounter, continueSecretRealm as continueRealmRun, createSecretRealmHistory, createSecretRealmRun, escapeSecretRealm as markSecretRealmEscaped, initialSecretRealmStates, loseSecretRealmRewards, nextSecretRealmEncounter, openSecretRealm, secretRealmRisk } from '../core/secretRealm/secretRealm'
import { sectOfferings } from '../data/sectOfferings'
import { pillById } from '../data/pills'
import { RECIPES } from '../data/recipes'

function emptySave(): GameSave {
  const now = new Date().toISOString()
  return {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: now, updatedAt: now, player: null, world: createWorld(), lifeRecords: [],
    reincarnation: initialReincarnation(), settings: { fortunateMode: true, autoSave: true, logLimit: 120 },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null, pendingLifeEvent: null, currentAction: null, pendingCombat: null, secretRealmRun: null,
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
  const ready = reactive({ loaded: false, saving: false, lastSaved: '', debugSecret: '', eventResultTitle: '', eventResultText: '', combatAnimationSkipToken: 0 })
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const player = computed(() => state.player)
  const currentRealm = computed(() => state.player ? REALMS[state.player.realmIndex] : REALMS[0])
  const breakthroughChance = computed(() => state.player ? calculateBreakthroughChance(state.player, state.world) : null)
  const breakthroughRequirements = computed(() => state.player ? checkBreakthroughRequirements(state.player) : null)
  const pendingEvent = computed(() => state.pendingEvent ? eventById(state.pendingEvent.eventId) : undefined)
  const pendingLifeEvent = computed(() => state.pendingLifeEvent ? lifeEventById(state.pendingLifeEvent.eventId) : undefined)
  const pendingCombat = computed(() => state.pendingCombat ?? undefined)
  const activeSecretRealm = computed(() => state.secretRealmRun ? secretRealmById(state.secretRealmRun.secretRealmId) : undefined)
  const availableSecretRealms = computed(() => state.player ? SECRET_REALMS.map((realm) => ({ realm, access: state.player!.secretRealmStates.find((entry) => entry.secretRealmId === realm.id), risk: secretRealmRisk(calculateCombatPower(state.player!, state.world).total, realm) })) : [])
  const combatPower = computed(() => state.player ? calculateCombatPower(state.player, state.world) : undefined)
  const combatAssessment = computed(() => state.player && state.pendingCombat ? combatStrengthLabel(calculateCombatPower(state.player, state.world).total, state.pendingCombat.enemy.combatPower) : '')
  const currentSect = computed(() => sectById(state.world.sects, state.player?.sectMembership?.sectId))
  const currentSectOfferings = computed(() => sectOfferings(currentSect.value?.type))
  const sectPeers = computed(() => state.player?.sectMembership ? state.world.npcCultivators.filter((npc) => npc.sectId === state.player!.sectMembership!.sectId && npc.alive).sort((a, b) => b.realmIndex - a.realmIndex) : [])
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
  function recordSocialMoment(text: string, type: Player['socialHistory'][number]['type'], important = false) {
    if (!state.player) return
    state.player.socialHistory.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, text, type })
    timeline(text, important ? 'realm' : 'life')
    if (important) recordLifeMoment(text, 'event', 3)
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
      wealth: 0, inventory: [], reputation: 0, bloodline: current.bloodline, memberIds: [current.id], kind: '凡人家族', resources: 0, fame: 0, territory: '故乡村镇', history: [], inheritedArtifacts: [],
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
    refreshCombatPower()
    state.world.families.push(createFamily(created))
    state.reincarnation.selections = defaultSelections()
    state.reincarnation.inHall = false
    state.pendingEvent = null
    state.pendingLifeEvent = null
    state.pendingCombat = null
    state.secretRealmRun = null
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
    if (isSoulDispersed(state.player)) { die('魂体稳定耗尽，魂飞魄散', { category: 'soul-dispersal', description: '魂体稳定耗尽，魂飞魄散' }); return true }
    if (isNaturalLifespanExpired(state.player)) { die('寿元耗尽', { category: 'lifespan', description: '寿元耗尽' }); return true }
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
    const masterLink = state.world.masterDisciples.find((entry) => entry.discipleId === state.player!.id && entry.status === 'active')
    const master = masterLink && state.world.npcCultivators.find((entry) => entry.id === masterLink.masterId)
    if (masterLink && master && !master.alive) { masterLink.status = 'ended'; recordSocialMoment(`师父${master.name}寿尽坐化，师徒缘分止于此年。`, 'relationship', true) }
    addMonths(state.world, months)
    state.player.ageMonths += months
    decayPillToxicity(state.player, months)
    const sect = sectById(state.world.sects, state.player.sectMembership?.sectId)
    if (sect && months >= 12) {
      const stipend = sectStipend(state.player, sect, months / 12)
      state.player.spiritStones += stipend
      if (stipend) timeline(`领取${sect.name}${state.player.sectMembership?.position}年俸 ${stipend} 枚灵石。`, 'loot')
    }
    if (months >= 12 && random.chance(Math.min(.16, months / 240))) {
      const livingNpcs = state.world.npcCultivators.filter((entry) => entry.alive)
      const npc = livingNpcs.length ? random.pick(livingNpcs) : undefined
      const discovered = state.player.secretRealmStates.filter((entry) => entry.discovered)
      if (npc && discovered.length) {
        const realm = secretRealmById(random.pick(discovered).secretRealmId)
        if (realm) state.world.worldEvents.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, text: random.chance(.82) ? `${npc.name}进入${realm.name}历练，据传有所收获。` : `${npc.name}失踪于${realm.name}深处，宗门魂灯黯淡。` })
      }
    }
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
    if (state.player?.alive && ageAfter > ageBefore && !state.pendingEvent && !state.pendingLifeEvent && !state.pendingCombat) {
      const yearlyChance = Math.min(.62, 1 - Math.pow(.84, ageAfter - ageBefore))
      if (random.chance(yearlyChance)) triggerLifeEvent()
    }
  }

  function lifeEventPool() {
    return state.player ? checkLifeEvents(state.player, state.world) : []
  }

  function triggerLifeEvent(eventId?: string) {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat) return false
    const forced = eventId ? lifeEventById(eventId) : undefined
    const selected = forced ?? selectLifeEvent(lifeEventPool(), random)
    if (!selected) return false
    state.pendingLifeEvent = { eventId: selected.id }
    scheduleSave()
    return true
  }

  function advanceYear(action: CultivationAction, years?: number, forcedResult?: ActionResultType) {
    const current = state.player
    if (!current?.alive || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat || state.currentAction) return undefined
    const definition = CULTIVATION_ACTIONS.find((entry) => entry.id === action)!
    const durationYears = definition.durationOptions.includes(years ?? definition.defaultDuration) ? years ?? definition.defaultDuration : definition.defaultDuration
    state.currentAction = { action, startedYear: state.world.currentYear, durationYears }
    const result = resolveCultivationAction(current, state.world, action, random, durationYears, { forcedResult })
    for (const [stat, delta] of Object.entries(result.statChanges) as [StatKey, number][]) if (delta) modifyStat(stat, delta, `${definition.name}所得`)
    if (result.fateTag) addFateTag(current, { ...result.fateTag, createdAt: state.world.currentYear })
    const log = createCultivationLog(result, state.world.currentYear, state.world.currentMonth)
    current.cultivationLogs.unshift(log)
    current.cultivationLogs.splice(200)
    if (log.importance >= 3) recordLifeMoment(`${result.title}：${result.summary}`, result.resultType === 'danger' || result.resultType === 'inner-demon' ? 'danger' : 'inheritance', log.importance)
    timeline(`${result.title}：${result.summary}`, result.resultType === 'danger' || result.resultType === 'inner-demon' ? 'event' : 'life')
    advanceTime(result.years * 12)
    if (current.alive && current.boundArtifact) nourishBoundArtifact(current, Math.max(1, result.years * (action === CultivationAction.MEDITATION ? 16 : action === CultivationAction.ENLIGHTENMENT ? 13 : action === CultivationAction.ADVENTURE ? 9 : 5)), action === CultivationAction.ENLIGHTENMENT ? 2 : 1)
    if (current.alive && action === CultivationAction.RECOVERY) decayPillToxicity(current, result.years * 12, true)
    if (current.alive && result.resultType === 'inner-demon' && current.pathResources.innerDemon >= 90 && random.chance(.08 + current.pathResources.innerDemon * .0012)) {
      const cause = '闭关时心魔失控，道心崩毁而亡'
      recordLifeMoment(cause, 'death', 4)
      die(cause, { category: 'inner-demon', description: cause })
    }
    if (current.alive) {
      const insightEvent = action === CultivationAction.ENLIGHTENMENT
        ? current.spiritualAptitude.innateRoot.elements.length === 5 ? 'five-unity-insight' : current.primaryPath === 'sword' ? 'sword-heart-insight' : current.primaryPath === 'demonic' ? 'demon-heart-trial' : undefined
        : undefined
      unlockAcquiredTalents(insightEvent)
      refreshFatePaths()
      const eventChance = Math.min(.95, result.lifeEventChance * lifeEventStateMultiplier(current) * state.world.continent.cultivationEnvironment.eventFrequencyMultiplier)
      if (result.resultType === 'danger' && !state.pendingEvent && !state.pendingLifeEvent && !state.pendingCombat) startCombat('beast', random.chance(.25) ? 1 : 0, 'adventure', '荒野山脉')
      if (!state.pendingEvent && !state.pendingLifeEvent && !state.pendingCombat && random.chance(eventChance)) triggerLifeEvent()
    }
    state.currentAction = null
    refreshCombatPower()
    scheduleSave()
    return result
  }

  function cultivate(months: number) {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat) return
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
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat) return
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

  function addItem(itemId: string, quantity = 1, source?: { location: string; source: string }) {
    if (!state.player) return
    mergeInventory(state.player.inventory, [{ itemId, quantity }])
    const definition = itemById(itemId)
    const qualityRank = ['凡品', '良品', '精品', '稀有', '珍品', '极品', '奇珍', '传说'].indexOf(definition?.quality ?? '凡品')
    if (source && definition && qualityRank >= 4 && !state.player.itemSourceHistory.some((entry) => entry.itemId === itemId && entry.year === state.world.currentYear && entry.location === source.location)) {
      state.player.itemSourceHistory.unshift({ itemId, year: state.world.currentYear, location: source.location, source: source.source })
    }
  }

  function joinPlayerSect(sectId: string) {
    const current = state.player
    const sect = sectById(state.world.sects, sectId)
    if (!current || !sect || !canJoinSect(current, sect)) return false
    const membership = admitToSect(current, sect, state.world.currentYear)
    if (!membership) return false
    const cohort = generateSectCohort(random, state.world.currentYear, sect)
    state.world.npcCultivators.push(...cohort)
    cohort.slice(0, 3).forEach((npc, index) => setRelationship(state.world.relationships, current.id, npc.id, index === 0 ? '好友' : '竞争', index === 0 ? 20 : 35, state.world.currentYear, '同期入门'))
    recordSocialMoment(`${current.name}加入${sect.name}，成为${membership.position}。`, 'sect', true)
    scheduleSave()
    return true
  }

  function donateSectResources(amount: number) {
    const current = state.player
    const sect = currentSect.value
    const value = Math.max(0, Math.floor(amount))
    if (!current?.sectMembership || !sect || !value || current.spiritStones < value) return false
    const oldPosition = current.sectMembership.position
    current.spiritStones -= value
    sect.resources += value
    addSectContribution(current, value)
    if (current.sectMembership.position !== oldPosition) recordSocialMoment(`宗门贡献累积，晋升为${current.sectMembership.position}。`, 'sect', true)
    else recordSocialMoment(`向${sect.name}上交${value}枚灵石，获得等量贡献。`, 'sect')
    scheduleSave()
    return true
  }

  function exchangeSectTechnique(techniqueId: string) {
    const current = state.player
    const sect = currentSect.value
    const cost = techniqueContributionCost(techniqueId)
    if (!current?.sectMembership || !sect?.techniqueIds.includes(techniqueId) || !canAccessSectTechnique(current, techniqueId) || current.knownTechniques.includes(techniqueId) || current.sectMembership.contribution < cost) return false
    current.sectMembership.contribution -= cost
    current.knownTechniques.push(techniqueId)
    const technique = techniqueById(techniqueId)
    if (technique) current.inheritanceHistory.push({ eventId: `sect:${sect.id}`, name: technique.name, year: state.world.currentYear, source: `${sect.name}贡献兑换` })
    recordSocialMoment(`以宗门贡献换得《${technique?.name ?? techniqueId}》。`, 'sect', true)
    scheduleSave()
    return true
  }

  function exchangeSectOffering(offeringId: string) {
    const current = state.player
    const sect = currentSect.value
    const offering = sectOfferings(sect?.type).find((entry) => entry.id === offeringId)
    if (!current?.sectMembership || !sect || !offering || current.sectMembership.contribution < offering.cost) return false
    current.sectMembership.contribution -= offering.cost
    if (offering.itemId) addItem(offering.itemId, 1, { location: sect.name, source: '宗门贡献兑换' })
    if (offering.recipeId && !current.knownRecipes.includes(offering.recipeId)) { current.knownRecipes.push(offering.recipeId); timeline(`从${sect.name}获得配方「${RECIPES.find((entry) => entry.id === offering.recipeId)?.name ?? offering.recipeId}」。`, 'life') }
    if (offering.secretRealmId) openSecretRealm(current.secretRealmStates, offering.secretRealmId, `${sect.name}秘境名额`, state.world.currentYear + 10)
    recordSocialMoment(`以 ${offering.cost} 宗门贡献换得「${offering.name}」。`, 'sect', Boolean(offering.secretRealmId))
    scheduleSave()
    return true
  }

  function chooseMaster(npcId: string) {
    const current = state.player
    const npc = state.world.npcCultivators.find((entry) => entry.id === npcId && entry.alive)
    if (!current || !npc || current.masterId || npc.realmIndex <= current.realmIndex || npc.sectId !== current.sectMembership?.sectId) return false
    current.masterId = npc.id
    setRelationship(state.world.relationships, npc.id, current.id, '师徒', 45, state.world.currentYear, '拜入门下')
    state.world.masterDisciples.push({ masterId: npc.id, discipleId: current.id, relationship: 45, startedYear: state.world.currentYear, status: 'active' })
    recordSocialMoment(`拜${npc.name}为师，正式列入门墙。`, 'relationship', true)
    scheduleSave()
    return true
  }

  function changePlayerRelationship(npcId: string, type: RelationshipType, value: number) {
    const current = state.player
    const npc = state.world.npcCultivators.find((entry) => entry.id === npcId)
    if (!current || !npc) return false
    setRelationship(state.world.relationships, current.id, npc.id, type, value, state.world.currentYear, '人生往来')
    recordSocialMoment(`与${npc.name}结为${type}。`, 'relationship', type === '仇恨' || type === '师徒')
    scheduleSave()
    return true
  }

  function establishCultivationFamily(name: string) {
    const current = state.player
    const family = current && state.world.families.find((entry) => entry.id === current.familyId)
    if (!current || !family || current.realmIndex < 11 || family.kind === '玩家家族') return false
    const territory = state.world.territories.find((entry) => entry.controllerType === '无主')
    promoteCultivationFamily(family, current, name, state.world.currentYear, territory)
    if (territory) { territory.controllerType = '家族'; territory.controllerId = family.id }
    recordSocialMoment(`${current.name}建立${family.name}修仙家族${territory ? `，以${territory.name}为族地` : ''}。`, 'family', true)
    scheduleSave()
    return true
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
    if (effect.type === 'ADD_ITEM') addItem(String(effect.value))
    if (effect.type === 'ADD_RESOURCE' && effect.resource) current.resources[effect.resource] = Math.max(0, current.resources[effect.resource] + amount)
    if (effect.type === 'ADD_STATE' && effect.state) addCharacterState(current, effect.state)
    if (effect.type === 'ADD_ELEMENT_GROWTH' && effect.element) growElement(current.spiritualAptitude, effect.element, amount)
    if (effect.type === 'ADD_SOUL_STABILITY') current.soulStability = Math.max(0, Math.min(100, (current.soulStability ?? 50) + amount))
    if (effect.type === 'LEARN_TECHNIQUE') {
      const techniqueId = String(effect.value)
      const technique = techniqueById(techniqueId)
      if (technique && !current.knownTechniques.includes(techniqueId)) {
        current.knownTechniques.push(techniqueId)
        current.inheritanceHistory.push({ eventId, name: technique.name, year: state.world.currentYear, source: effect.text ?? eventId })
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
    if (effect.type === 'ADD_CONTRIBUTION') addSectContribution(current, amount)
    if (effect.type === 'ADD_FAMILY_RESOURCE') {
      const family = state.world.families.find((entry) => entry.id === current.familyId)
      if (family) family.resources = Math.max(0, family.resources + amount)
    }
    if (effect.type === 'ADD_RELATIONSHIP' && effect.relationshipType) {
      const target = state.world.npcCultivators.find((npc) => npc.alive && npc.id !== current.id && (!current.sectMembership || npc.sectId === current.sectMembership.sectId))
      if (target) setRelationship(state.world.relationships, current.id, target.id, effect.relationshipType, amount, state.world.currentYear, effect.text ?? eventId)
    }
  }

  function chooseLifeEvent(choiceId: string, forcedRiskOutcome?: RiskOutcome) {
    const event = pendingLifeEvent.value
    const current = state.player
    if (!event || !current) return false
    const resolved = resolveLifeEventChoice(event, choiceId, current, state.world)
    if (!resolved) return false
    const entersCombat = event.dangerTags.includes('combat') && (resolved.choice.riskModifier ?? 0) >= .45 && forcedRiskOutcome === undefined
    if (entersCombat) {
      recordLifeEvent(current, resolved.record)
      recordLifeMoment(`${event.name}：${resolved.choice.label}。一场斗法已不可避免。`, 'combat', event.importance)
      state.pendingLifeEvent = null
      const enemyType: CombatEnemyType = event.tags.includes('beast') ? 'beast' : event.tags.includes('sect') || event.dangerTags.includes('sect-war') || event.dangerTags.includes('revenge') ? 'sect' : 'cultivator'
      const difficulty = Math.max(-1, Math.min(3, (event.recommendedRealmIndex ?? current.realmIndex) - current.realmIndex))
      const sourceType: CombatContext['sourceType'] = event.tags.includes('sect') ? 'SECT_EVENT' : event.tags.includes('family') ? 'FAMILY_EVENT' : 'LIFE_EVENT'
      startCombat(enemyType, difficulty, 'event', event.name, undefined, {
        sourceType, sourceId: event.id, eventChoiceId: choiceId, location: event.name, riskLevel: event.riskLevel, mode: 'overlay',
        returnState: { label: sourceType === 'SECT_EVENT' ? '返回宗门' : '继续事件', resultText: resolved.choice.result },
      })
      if (state.pendingCombat) { state.pendingCombat.sourceEventId = event.id; state.pendingCombat.victoryEffects = resolved.choice.effects.map((effect) => ({ ...effect })) }
      scheduleSave()
      return true
    }
    const assessment = calculateEventRisk(event, current, state.world, resolved.choice)
    const riskOutcome = forcedRiskOutcome ?? resolveEventRisk(assessment, random)
    recordLifeEvent(current, resolved.record)
    current.eventRiskHistory.push({ eventId: event.id, eventName: event.name, year: state.world.currentYear, choiceId, riskLevel: assessment.riskLevel, rewardLevel: assessment.rewardLevel, deathChance: assessment.deathChance, severeInjuryChance: assessment.severeInjuryChance, outcome: riskOutcome })
    recordLifeMoment(`${event.name}：${resolved.choice.label}。${resolved.choice.result}`, 'event', event.importance)
    if (assessment.riskLevel > 0) {
      current.dangerousEventCount++
      current.dangerRecords.push({ eventId: event.id, year: state.world.currentYear, source: event.dangerTags.join('、') || '未知危险', result: riskOutcome, survived: riskOutcome !== 'death' })
    }
    if (riskOutcome === 'death') {
      const category = eventDeathCategory(event)
      const cause = `进入「${event.name}」后遭遇${event.dangerTags.includes('restriction') ? '禁制袭击' : event.dangerTags.includes('possession') ? '夺舍反噬' : event.dangerTags.includes('soul-dispersal') ? '魂体崩解' : event.dangerTags.includes('combat') ? '生死战' : '致命危机'}，陨落其中`
      state.pendingLifeEvent = null
      ready.eventResultTitle = `${event.name} · 身死道消`
      ready.eventResultText = cause
      die(cause, { category, description: cause, eventId: event.id })
      scheduleSave()
      return true
    }
    if (riskOutcome === 'severe-injury') { addCharacterState(current, CharacterState.SERIOUS_INJURY); current.severeInjuryCount++; modifyStat('constitution', -2, `${event.name}中遭受重创`) }
    if (riskOutcome === 'injured') addCharacterState(current, CharacterState.INJURED)
    for (const effect of resolved.choice.effects) applyLifeEventEffect(effect, event.id)
    const rareReward = riskOutcome === 'turning-point' || random.chance(assessment.rareRewardChance)
    if (rareReward && assessment.rewardLevel >= 2) {
      const bonus = assessment.rewardLevel * 2
      current.resources.spiritHerbs += bonus
      current.spiritStones += assessment.rewardLevel * 25
      current.majorOpportunities.push({ eventId: event.id, name: event.name, year: state.world.currentYear, rewardLevel: assessment.rewardLevel, result: riskOutcome === 'turning-point' ? '绝境中遇见转机' : '获得额外珍稀机缘' })
    }
    if (assessment.riskLevel >= 2 && !current.lifeTimeline.some((entry) => entry.type === 'danger')) {
      current.nearDeathCount++
      recordLifeMoment(`在「${event.name}」中第一次直面生死危机。`, 'danger', 3)
    }
    unlockAcquiredTalents(event.id)
    refreshFatePaths()
    ready.eventResultTitle = event.name
    ready.eventResultText = `${resolved.choice.result}${riskOutcome === 'turning-point' ? ' 生死关头，气运为你带来一线转机。' : riskOutcome === 'severe-injury' ? ' 你虽活着归来，却已身受重伤。' : riskOutcome === 'injured' ? ' 你付出伤势作为代价。' : ''}${rareReward && assessment.rewardLevel >= 2 ? ' 你还发现了额外的珍稀收获。' : ''}`
    state.pendingLifeEvent = null
    scheduleSave()
    return true
  }

  function closeEventResult() {
    ready.eventResultTitle = ''
    ready.eventResultText = ''
  }

  function adventure() {
    if (!state.player?.alive || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat) return
    advanceTime(3)
    if (!state.player.alive) return
    if (random.chance(.36)) {
      const location = random.pick(['青云山脉', '赤炎谷', '阴魂岭', '寒潭水域'])
      startCombat(random.chance(.62) ? 'beast' : 'cultivator', random.chance(.18) ? 1 : 0, 'adventure', location, undefined, {
        sourceType: 'ADVENTURE', sourceId: location, location, riskLevel: 2, mode: 'overlay', returnState: { label: '继续历练', resultText: `你在${location}处理完这场遭遇，重新踏上历练之路。` },
      })
      scheduleSave()
      return
    }
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

  function enterSecretRealm(realmId: string) {
    const current = state.player
    const realm = secretRealmById(realmId)
    if (!current?.alive || !realm || state.secretRealmRun || state.pendingCombat || !canEnterSecretRealm(current, realm, state.world.currentYear)) return false
    state.secretRealmRun = createSecretRealmRun(realmId)
    const realmState = current.secretRealmStates.find((entry) => entry.secretRealmId === realmId)
    if (realmState) realmState.runsThisLife = (realmState.runsThisLife ?? 0) + 1
    timeline(`进入「${realm.name}」，此行战利品将在安全撤离后收入乾坤袋。`, 'event')
    scheduleSave()
    return true
  }

  function resolveSecretRealmEncounter() {
    const current = state.player
    const run = state.secretRealmRun
    const encounter = run?.pendingEncounter
    const realm = run && secretRealmById(run.secretRealmId)
    if (!current?.alive || !run || !encounter || !realm || encounter.type === 'COMBAT') return false
    if (encounter.type === 'HAZARD') {
      const protection = Math.min(.65, current.equipment.artifactSlots.includes('restriction-awl') ? .28 : 0)
      if (random.chance(Math.max(.03, (encounter.injuryChance ?? .12) * (1 - protection)))) {
        const serious = encounter.risk >= 4 && random.chance(.45)
        addCharacterState(current, serious ? CharacterState.SERIOUS_INJURY : CharacterState.INJURED)
        run.injuries.push(serious ? '重伤' : '轻伤')
        run.eventHistory.push(`${encounter.name}中触动禁制，${serious ? '身受重伤' : '受了轻伤'}。`)
      }
    }
    completeSecretRealmEncounter(run, encounter, encounter.rewards, random)
    if (encounter.recipeId && !current.knownRecipes.includes(encounter.recipeId)) { current.knownRecipes.push(encounter.recipeId); timeline(`在${realm.name}发现配方「${RECIPES.find((entry) => entry.id === encounter.recipeId)?.name ?? encounter.recipeId}」。`, 'life') }
    timeline(`秘境第${run.currentDepth}层「${encounter.name}」探索完成。`, encounter.type === 'TREASURE' ? 'loot' : 'event')
    scheduleSave()
    return true
  }

  function exploreSecretRealm() {
    const current = state.player
    const run = state.secretRealmRun
    const realm = run && secretRealmById(run.secretRealmId)
    if (!current?.alive || !run || !realm || state.pendingCombat) return false
    const encounter = nextSecretRealmEncounter(run)
    if (!encounter) return false
    if (encounter.type === 'COMBAT') {
      const location = `${realm.name}第${run.currentDepth}层 · ${encounter.name}`
      startCombat(encounter.enemyType ?? 'beast', encounter.enemyDifficulty ?? 0, 'secretRealm', location, undefined, { sourceType: 'SECRET_REALM', sourceId: encounter.id, location, riskLevel: encounter.risk, mode: 'overlay', returnState: { label: '返回秘境', resultText: `战斗结束，你仍在${realm.name}第${run.currentDepth}层。` } })
    } else resolveSecretRealmEncounter()
    scheduleSave()
    return true
  }

  function continueSecretRealm(routeId?: string) {
    const run = state.secretRealmRun
    if (!run || !continueRealmRun(run, routeId, random, state.player ?? undefined)) return false
    scheduleSave()
    return true
  }

  function leaveSecretRealm() {
    const current = state.player
    const run = state.secretRealmRun
    const realm = run && secretRealmById(run.secretRealmId)
    if (!current || !run || !realm || !markSecretRealmEscaped(run)) return false
    const status = run.status
    for (const reward of run.collectedRewards) addItem(reward.itemId, reward.quantity, { location: `${realm.name}第${run.currentDepth}层`, source: status === 'CLEARED' ? '秘境通关' : '秘境撤离' })
    current.secretRealmHistory.unshift(createSecretRealmHistory(run, state.world.currentYear))
    if (status === 'CLEARED') {
      const realmState = current.secretRealmStates.find((entry) => entry.secretRealmId === realm.id)
      if (realmState && !realmState.firstClearCompleted) {
        realmState.firstClearCompleted = true
        const reward = realm.id === 'myriad-sword' ? 'frost-edge-sword' : realm.id === 'nether-tomb' ? 'soul-calming-bell' : realm.id === 'five-element-ruins' ? 'five-element-orb' : 'artifact-embryo'
        addItem(reward, 1, { location: realm.name, source: '秘境首通奖励' })
        current.fateTags.push({ id: `REALM_FIRST_CLEAR_${realm.id}`, name: `${realm.name}首通者`, description: '击败秘境最终守关者获得的声名。', createdAt: state.world.currentYear })
        recordLifeMoment(`首次通关${realm.name}，从最深处带回传承。`, 'inheritance', 4)
      }
      timeline(`通关${realm.name}，安全带回全部战利品。`, 'realm')
    } else timeline(`从${realm.name}第${run.currentDepth}层主动撤离，安全带回战利品。`, 'loot')
    state.secretRealmRun = null
    const realmState = current.secretRealmStates.find((entry) => entry.secretRealmId === realm.id)
    if (realmState) realmState.cooldownUntilYear = state.world.currentYear + (status === 'CLEARED' ? 4 : 2)
    scheduleSave()
    return true
  }

  function failSecretRealm(cause = '秘境禁制爆发，陨落其中') {
    const current = state.player
    const run = state.secretRealmRun
    const realm = run && secretRealmById(run.secretRealmId)
    if (!current?.alive || !run || !realm) return false
    loseSecretRealmRewards(run)
    current.secretRealmHistory.unshift(createSecretRealmHistory(run, state.world.currentYear))
    recordLifeMoment(`深入${realm.name}第${run.currentDepth}层，${cause}。`, 'death', 4)
    die(cause, { category: 'restriction', description: cause, eventId: realm.id })
    scheduleSave()
    return true
  }

  function refreshCombatPower() {
    if (!state.player) return 0
    state.player.combatPower = calculateCombatPower(state.player, state.world).total
    for (const npc of state.world.npcCultivators) npc.combatPower = calculateNPCCombatPower(npc)
    return state.player.combatPower
  }

  function startCombat(type: CombatEnemyType = 'beast', difficulty = 0, source: NonNullable<GameSave['pendingCombat']>['source'] = 'adventure', environment = '荒野', npcId?: string, context?: CombatContext) {
    const current = state.player
    if (!current?.alive || state.pendingCombat || (source !== 'event' && (state.pendingEvent || state.pendingLifeEvent)) || (state.currentAction && source !== 'adventure')) return false
    const npc = npcId ? state.world.npcCultivators.find((entry) => entry.id === npcId && entry.alive) : undefined
    refreshCombatPower()
    const enemy = createCombatEnemy(current, type, random, difficulty, npc ? { id: npc.id, name: npc.name, realmIndex: npc.realmIndex, path: npc.path, combatPower: npc.combatPower, spiritRoot: npc.spiritRoot } : undefined)
    const sourceType: CombatContext['sourceType'] = source === 'adventure' ? 'ADVENTURE' : source === 'sect' ? 'SECT_EVENT' : source === 'family' ? 'FAMILY_EVENT' : source === 'secretRealm' ? 'SECRET_REALM' : source === 'debug' ? 'DEBUG' : 'LIFE_EVENT'
    state.pendingCombat = { enemy, environment, source, context: context ?? { sourceType, sourceId: npcId ?? environment, location: environment, riskLevel: Math.max(0, Math.min(4, difficulty + 2)), mode: 'overlay', returnState: { label: source === 'adventure' ? '继续历练' : source === 'sect' ? '返回宗门' : source === 'debug' ? '结束演武' : '继续事件' } } }
    timeline(`在${environment}遭遇${enemy.name}，对方战力约为 ${enemy.combatPower.toLocaleString()}。`, 'event')
    scheduleSave()
    return true
  }

  function startNPCCombat(npcId: string, source: NonNullable<GameSave['pendingCombat']>['source'] = 'sect') {
    const npc = state.world.npcCultivators.find((entry) => entry.id === npcId)
    const location = source === 'sect' ? '宗门演武台' : '荒野'
    return npc ? startCombat('rival', 0, source, location, npcId, { sourceType: source === 'sect' ? 'NPC_DUEL' : 'LIFE_EVENT', sourceId: npcId, location, riskLevel: source === 'sect' ? 0 : 2, mode: 'overlay', returnState: { label: source === 'sect' ? '返回宗门' : '继续事件', resultText: source === 'sect' ? `与${npc.name}的切磋已经结束。` : undefined } }) : false
  }

  function resolvePendingCombat(strategy: CombatStrategy, battleCardId?: string, forceOutcome?: CombatOutcome) {
    const current = state.player
    const pending = state.pendingCombat
    if (!current?.alive || !pending) return undefined
    const stonesBefore = current.spiritStones
    const cultivationBefore = current.cultivation
    const inventoryBefore = new Map(current.inventory.map((entry) => [entry.itemId, entry.quantity]))
    const card = battleCardId ? current.battleCards.find((entry) => entry.id === battleCardId && entry.charges > 0) ?? (battleCardId.startsWith('artifact:') ? artifactBattleCard(current, battleCardId.slice('artifact:'.length)) : undefined) : undefined
    const record = resolveCombat(current, pending.enemy, strategy, pending.environment, state.world, random, { battleCard: card, forceOutcome })
    record.context = pending.context
    if (pending.source === 'sect' && record.outcome === 'death') { record.outcome = 'defeat'; record.summary = `切磋不敌${pending.enemy.name}，被同门及时救下。` }
    if (card) {
      const ownedCard = current.battleCards.find((entry) => entry.id === card.id)
      if (ownedCard) ownedCard.charges--
      if (card.type === 'artifact') record.rounds.unshift({ round: 0, actor: 'player', text: `祭起法宝「${card.name}」：${card.description}`, damage: 0, playerHealth: record.playerHealthMax ?? 0, enemyHealth: record.enemyHealthMax ?? 0 })
      if (card.lifespanCost) {
        current.lifespanBonusMonths -= card.lifespanCost
        current.lifespanMonths = calculateMaxLifespanMonths(current)
      }
      current.battleCards = current.battleCards.filter((entry) => entry.charges > 0)
      if (card.id === 'qi-burst-pill') {
        const pill = pillById('qi-burst-pill')
        if (pill) recordPill(current, pill, state.world.currentYear, .15)
        if (record.outcome !== 'death' && random.chance(.35)) addCharacterState(current, CharacterState.INJURED)
      }
    }
    if (current.primaryPath === 'demonic' && strategy === CombatStrategy.DESPERATE) {
      current.lifespanBonusMonths -= 12
      current.pathResources.demonicNature = Math.min(100, current.pathResources.demonicNature + 6)
      current.lifespanMonths = calculateMaxLifespanMonths(current)
    }
    current.battleStats.battles++
    const experienceGained = Math.max(5, Math.round(pending.enemy.combatPower / Math.max(30, current.combatPower) * 20))
    current.battleStats.experience += experienceGained
    record.experienceGained = experienceGained
    const npcOpponent = pending.enemy.npcId ? state.world.npcCultivators.find((entry) => entry.id === pending.enemy.npcId) : undefined
    if (npcOpponent) { npcOpponent.battleStats.battles++; npcOpponent.battleStats.experience += 10 }
    if (record.outcome === 'victory') {
      current.battleStats.wins++
      current.battleStats.winStreak++
      if (pending.source !== 'sect') current.battleStats.kills++
      if (pending.enemy.type === 'beast') current.battleStats.beastKills++
      if (record.enemyPower > record.playerPower) current.battleStats.upsetWins++
      if (pending.source !== 'secretRealm') {
        current.spiritStones += pending.enemy.rewardStones
        if (pending.enemy.rewardItemId) addItem(pending.enemy.rewardItemId)
        if (pending.enemy.type === 'beast') current.resources.beastCores += Math.max(1, Math.round(pending.enemy.realmIndex / 4))
      }
      if (npcOpponent) { npcOpponent.battleStats.losses++; npcOpponent.battleStats.winStreak = 0 }
      if (npcOpponent && pending.source !== 'sect') { npcOpponent.alive = false; npcOpponent.deathYear = state.world.currentYear }
      if ((pending.enemy.type === 'cultivator' || pending.enemy.type === 'sect') && pending.source !== 'sect') addFateTag(current, { id: 'KILLED_DISCIPLE', name: '杀修因果', description: '斗法中取走修士性命，或将引来后续追索。', createdAt: state.world.currentYear })
      if (pending.victoryEffects) for (const effect of pending.victoryEffects) applyLifeEventEffect(effect, pending.sourceEventId ?? 'combat')
    } else if (record.outcome === 'escape') {
      current.battleStats.escapes++
      current.battleStats.winStreak = 0
      if (npcOpponent) npcOpponent.battleStats.escapes++
    } else {
      current.battleStats.losses++
      current.battleStats.winStreak = 0
      if (npcOpponent) { npcOpponent.battleStats.wins++; npcOpponent.battleStats.winStreak++ }
      if (record.outcome === 'defeat') {
        addCharacterState(current, record.enemyPower > record.playerPower * 1.3 ? CharacterState.SERIOUS_INJURY : CharacterState.INJURED)
        if (record.enemyPower > record.playerPower * 1.3) { current.severeInjuryCount++; modifyStat('constitution', -1, `与${record.enemyName}斗法落败`) }
      }
    }
    const healthInjury = combatInjuryFromHealth(record.playerHealthRemaining ?? record.playerHealthMax ?? 1, record.playerHealthMax ?? 1, record.outcome === 'death')
    if (record.outcome !== 'death' && (healthInjury === 'serious' || healthInjury === 'near-death') && !current.characterStates.includes(CharacterState.SERIOUS_INJURY)) {
      addCharacterState(current, CharacterState.SERIOUS_INJURY)
      current.severeInjuryCount++
    } else if (record.outcome !== 'death' && healthInjury === 'injured' && !current.characterStates.includes(CharacterState.INJURED) && !current.characterStates.includes(CharacterState.SERIOUS_INJURY)) addCharacterState(current, CharacterState.INJURED)
    current.combatHistory.unshift(record)
    current.combatHistory.splice(120)
    const loot: CombatLoot[] = []
    const stonesGained = current.spiritStones - stonesBefore
    if (stonesGained > 0) loot.push({ id: 'spirit-stones', name: '灵石', quantity: stonesGained, type: 'stones' })
    for (const stack of current.inventory) {
      const gained = stack.quantity - (inventoryBefore.get(stack.itemId) ?? 0)
      if (gained > 0) loot.push({ id: stack.itemId, name: itemById(stack.itemId)?.name ?? stack.itemId, quantity: gained, type: 'item' })
    }
    if (record.outcome === 'victory' && pending.enemy.type === 'beast') loot.push({ id: 'beast-cores', name: '妖丹资源', quantity: Math.max(1, Math.round(pending.enemy.realmIndex / 4)), type: 'resource' })
    const cultivationGained = current.cultivation - cultivationBefore
    if (cultivationGained > 0) loot.push({ id: 'cultivation', name: '修为', quantity: cultivationGained, type: 'cultivation' })
    loot.push({ id: 'battle-experience', name: '战斗经验', quantity: experienceGained, type: 'experience' })
    record.loot = loot
    if (pending.source === 'secretRealm' && state.secretRealmRun?.pendingEncounter) {
      const encounter = state.secretRealmRun.pendingEncounter
      if (record.outcome === 'victory') {
        completeSecretRealmEncounter(state.secretRealmRun, encounter, encounter.rewards, random)
        for (const reward of encounter.rewards) record.loot.push({ id: reward.itemId, name: itemById(reward.itemId)?.name ?? reward.itemId, quantity: reward.quantity, type: 'item' })
      } else if (record.outcome !== 'death') {
        state.secretRealmRun.eventHistory.push(`第${state.secretRealmRun.currentDepth}层与${record.enemyName}交锋后负伤退开。`)
        state.secretRealmRun.pendingEncounter = undefined
        state.secretRealmRun.awaitingDecision = true
      }
      if (current.boundArtifact) nourishBoundArtifact(current, record.outcome === 'victory' ? 14 : 6, 1)
    }
    if (record.outcome === 'death') record.injury = 'death'
    else if (current.characterStates.includes(CharacterState.SERIOUS_INJURY)) record.injury = 'serious'
    else if (current.characterStates.includes(CharacterState.INJURED)) record.injury = 'injured'
    else record.injury = combatInjuryFromHealth(record.playerHealthRemaining ?? record.playerHealthMax ?? 1, record.playerHealthMax ?? 1)
    const unlocked = unlockBattleAchievements(current, record)
    refreshCombatPower()
    timeline(`斗法${record.outcome === 'victory' ? '告捷' : record.outcome === 'escape' ? '避战脱身' : record.outcome === 'death' ? '身死' : '落败'}：${record.summary}`, record.outcome === 'victory' ? 'realm' : 'event')
    if (record.legendary) recordLifeMoment(`${REALMS[current.realmIndex].name}时越境击败${record.enemyName}，一战扬名。`, 'combat', 4)
    else if (record.outcome === 'defeat' || record.outcome === 'death') recordLifeMoment(`与${record.enemyName}斗法，${record.summary}`, 'combat', 3)
    for (const achievement of unlocked) recordLifeMoment(`获得战斗成就【${achievement}】。`, 'combat', 3)
    state.pendingCombat = null
    if (record.outcome !== 'death' && pending.context && ['LIFE_EVENT', 'SECT_EVENT', 'FAMILY_EVENT', 'NPC_DUEL'].includes(pending.context.sourceType)) {
      ready.eventResultTitle = record.outcome === 'victory' ? `${record.enemyName} · 战斗胜利` : record.outcome === 'escape' ? '成功脱离战斗' : '负伤脱身'
      ready.eventResultText = `${record.summary}${record.outcome === 'victory' && pending.context.returnState?.resultText ? ` ${pending.context.returnState.resultText}` : ''}`
    }
    if (record.outcome === 'death' && pending.source === 'secretRealm') failSecretRealm(`与${record.enemyName}斗法，力战而亡`)
    else if (record.outcome === 'death') die(`在${record.environment}与${record.enemyName}斗法，力战而亡`, { category: 'combat', description: record.summary })
    scheduleSave()
    return record
  }

  function unlockAchievements(current: Player) {
    if (current.achievements.includes('证得金丹') && !state.reincarnation.unlockedTalents.includes('sword')) state.reincarnation.unlockedTalents.push('sword')
    if (current.achievements.includes('证得元婴') && !state.reincarnation.unlockedTalents.includes('dao-body')) state.reincarnation.unlockedTalents.push('dao-body')
  }

  function breakthrough(options: BreakthroughOptions & { forceSuccess?: boolean } = {}) {
    const current = state.player
    if (!current || state.pendingEvent || state.pendingLifeEvent || state.pendingCombat || !canBreakthrough(current)) return
    const calculation = calculateBreakthroughChance(current, state.world, options)
    const chance = calculation.final
    const fromRealm = REALMS[current.realmIndex]
    const targetRealm = REALMS[current.realmIndex + 1]
    const major = isMajorBreakthrough(current.realmIndex + 1)
    const lifespanBefore = current.lifespanMonths
    consumeBreakthroughAid(current, calculation.aid, state.world.currentYear)
    if (calculation.aid.lifespanMonths) current.lifespanMonths = calculateMaxLifespanMonths(current)
    let succeeded = false
    let resultText = ''
    advanceTime(1)
    if (!current.alive) return
    if (options.forceSuccess ?? random.chance(chance)) {
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
      resultText = `突破成功，踏入${newRealm.name}${calculation.aid.descriptions.length ? `；辅助：${calculation.aid.descriptions.join('、')}` : ''}。`
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
      const oldPosition = current.sectMembership?.position
      const newPosition = updateSectPosition(current)
      if (newPosition && newPosition !== oldPosition) recordSocialMoment(`境界提升后晋升为${newPosition}。`, 'sect', true)
    } else {
      const lossPercent = major ? random.randomInt(20, 45) : random.randomInt(2, 7)
      current.cultivation = Math.round(current.cultivation * (100 - lossPercent) / 100)
      const highRealm = targetRealm.group === '金丹' || current.realmIndex >= 15
      const bodyResistance = current.primaryPath === 'body' ? .7 : 1
      const demonicRisk = current.primaryPath === 'demonic' ? 1.5 : 1
      const lifespanLoss = major && highRealm ? Math.round(Math.max(3, current.realmIndex - 8) * random.randomInt(1, 3) * bodyResistance * demonicRisk) : 0
      if (lifespanLoss) { current.lifespanBonusMonths -= lifespanLoss; current.lifespanMonths = calculateMaxLifespanMonths(current) }
      if (major && (current.primaryPath === 'demonic' || highRealm)) {
        current.pathResources.innerDemon = Math.min(100, current.pathResources.innerDemon + (current.primaryPath === 'demonic' ? 12 : 5))
        if (random.chance(.28 + (current.primaryPath === 'demonic' ? .18 : 0))) addCharacterState(current, CharacterState.INNER_DEMON)
      }
      current.breakthroughProgress = Math.max(0, current.breakthroughProgress - (major ? 35 : 10))
      if (major) addCharacterState(current, random.chance(highRealm ? .42 : .16) ? CharacterState.SERIOUS_INJURY : CharacterState.INJURED)
      addCharacterState(current, CharacterState.BOTTLENECK)
      resultText = major ? `突破${targetRealm.group}失败，修为损失 ${lossPercent}%${lifespanLoss ? `，并留下暗伤、折损${lifespanLoss}个月寿元` : '，经脉受创'}。` : `小境界突破失败，停留${fromRealm.name}，修为损失 ${lossPercent}%。`
      if (major && highRealm) modifyStat('constitution', -1, '大境界突破失败，留下暗伤')
      if (current.cultivationRequired > 0 && current.cultivation / current.cultivationRequired < .15) current.nearDeathCount++
      timeline(resultText, 'event')
      const previousFailures = current.breakthroughHistory.filter((entry) => !entry.success && entry.toRealm === targetRealm.name).length
      const attemptText = previousFailures === 0 ? '第一次' : `第${previousFailures + 1}次`
      recordLifeMoment(`${attemptText}突破${major ? targetRealm.group : targetRealm.name}失败。${highRealm ? '此劫在道基中留下暗伤。' : ''}`, major ? 'danger' : 'realm', major ? 3 : 2)
      if (major && random.chance(Math.max(0, current.realmIndex - 16) * .006)) die('突破失败，道基崩毁', { category: 'breakthrough', description: '突破失败，道基崩毁' })
    }
    current.breakthroughHistory.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, month: state.world.currentMonth, fromRealm: fromRealm.name, toRealm: targetRealm.name, success: succeeded, chance, result: resultText, lifespanBefore, lifespanAfter: current.lifespanMonths })
    removeFateTag(current, 'FRIEND_GUARDED_BREAKTHROUGH')
    current.breakthroughHistory.splice(100)
    refreshCombatPower()
    scheduleSave()
  }

  function preserveFamilyAssets(current: Player) {
    const family = state.world.families.find((entry) => entry.id === current.familyId)
    if (!family) return
    family.wealth += Math.floor(current.spiritStones * .5)
    mergeInventory(family.inventory, current.inventory.map((item) => ({ itemId: item.itemId, quantity: Math.floor(item.quantity / 2) })).filter((item) => item.quantity > 0))
    family.reputation += current.realmIndex * 2 + current.achievements.length * 5
    family.resources += Math.floor(current.spiritStones * .2)
    family.fame = Math.min(100, family.fame + current.realmIndex)
    if (current.boundArtifact && !family.inheritedArtifacts?.some((entry) => entry.ownerId === current.id && entry.artifactId === current.boundArtifact!.artifactId)) {
      const definition = itemById(current.boundArtifact.artifactId)
      family.inheritedArtifacts ??= []
      family.inheritedArtifacts.push({ artifactId: current.boundArtifact.artifactId, artifactName: definition?.name ?? current.boundArtifact.artifactId, ownerName: current.name, ownerId: current.id, nourishment: current.boundArtifact.nourishment, affinity: current.boundArtifact.affinity, sourceHistory: current.itemSourceHistory.filter((entry) => entry.itemId === current.boundArtifact!.artifactId).map((entry) => ({ ...entry, inheritedFrom: current.name })), formerOwners: [...current.boundArtifact.formerOwners, current.name], totalNourishment: current.boundArtifact.totalNourishment, legacyLevel: current.boundArtifact.legacyLevel })
      mergeInventory(family.inventory, [{ itemId: current.boundArtifact.artifactId, quantity: 1 }])
      family.history.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, text: `${definition?.name ?? '本命法宝'}成为${family.name}传承法宝，曾为${current.name}本命之物。`, type: 'family' })
    }
  }

  function die(cause: string, detail?: Player['deathCause']) {
    const current = state.player
    if (!current?.alive) return
    current.alive = false
    current.deathFinalized = false
    current.causeOfDeath = cause
    current.deathCause = detail ?? { category: cause.includes('魂飞魄散') ? 'soul-dispersal' : cause.includes('寿元') ? 'lifespan' : cause.includes('突破') ? 'breakthrough' : cause.includes('心魔') ? 'inner-demon' : 'adventure', description: cause }
    state.pendingEvent = null
    state.pendingLifeEvent = null
    state.pendingCombat = null
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
    if (!state.lifeRecords.some((record) => record.playerId === current.id)) state.lifeRecords.unshift(createLifeRecord(current, state.world.currentYear, realmName(current.realmIndex), points, state.world.relationships))
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
    current.deathCause = undefined
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
    const familyLegacy = family ? inheritFamilyLegacy(family) : undefined
    descendant.isPlayer = true
    state.player = {
      id: descendant.id, name: descendant.name, generation: state.lifeRecords.length + 1, birthYear: descendant.birthYear,
      ageMonths: descendant.ageMonths, lifespanMonths: descendant.lifespanMonths, realmIndex: descendant.realmIndex,
      cultivation: descendant.cultivation, cultivationRequired: REALMS[descendant.realmIndex].cultivationRequired,
      spiritRoot: { ...descendant.spiritRoot, elements: [...descendant.spiritRoot.elements], mutations: [...descendant.spiritRoot.mutations] }, stats: { ...descendant.stats }, statPotential: { ...descendant.statPotential }, statHistory: [], spiritStones: descendant.spiritStones + (familyLegacy?.spiritStones ?? 0),
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
      eventRiskHistory: [], dangerRecords: [], majorOpportunities: [], inheritanceHistory: [], discipleIds: [], socialHistory: [],
      combatPower: 0, combatHistory: [], battleAchievements: [], equippedArtifacts: [], battleCards: [], battleStats: initialBattleStats(),
      equipment: emptyEquipment(), boundArtifact: null, pillToxicity: 0, consumedPillHistory: [], knownRecipes: ['make-qi-pill', 'make-healing-pill', 'forge-green-edge'], secretRealmStates: initialSecretRealmStates(), secretRealmHistory: [], itemSourceHistory: family?.inheritedArtifacts?.flatMap((entry) => entry.sourceHistory.map((source) => ({ ...source }))) ?? [],
    }
    state.player.lifespanMonths = calculateMaxLifespanMonths(state.player)
    if (family) { family.wealth = Math.ceil(family.wealth * .5); family.resources = Math.ceil(family.resources * .5); family.history.unshift({ id: crypto.randomUUID(), year: state.world.currentYear, text: `${descendant.name}继承家族血脉与部分资产。`, type: 'family' }); transferInventory(family.inventory, state.player.inventory) }
    state.reincarnation.inHall = false
    state.pendingLifeEvent = null
    state.pendingCombat = null
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
    if (!current?.alive || !stack || !definition) return false
    if (definition.pill) {
      const result = usePill(current, itemId, state.world.currentYear)
      if (!result.ok) { ready.eventResultTitle = definition.name; ready.eventResultText = result.message; return false }
      timeline(`服用「${definition.name}」，${result.message}，当前丹毒 ${Math.round(current.pillToxicity)}。`, 'loot')
      refreshCombatPower(); scheduleSave(); return true
    }
    if (!definition.effects?.length) return false
    for (const effect of definition.effects) {
      if (effect.type === 'cultivation') current.cultivation += effect.value
      if (effect.type === 'lifespan') current.lifespanMonths += effect.value
      if (effect.type === 'stone') current.spiritStones += effect.value
    }
    stack.quantity--
    if (stack.quantity <= 0) current.inventory = current.inventory.filter((entry) => entry.itemId !== itemId)
    timeline(`服用「${definition.name}」，药力在体内化开。`, 'loot')
    scheduleSave()
    return true
  }

  function equipInventoryItem(itemId: string) {
    const current = state.player
    if (!current) return false
    const result = equipItem(current, itemId)
    if (!result.ok) { ready.eventResultTitle = '无法装备'; ready.eventResultText = result.reason; return false }
    const definition = itemById(itemId)
    current.lifespanMonths = calculateMaxLifespanMonths(current)
    refreshCombatPower()
    timeline(`装备「${definition?.name ?? itemId}」，当前战力 ${current.combatPower.toLocaleString()}。`, 'loot')
    scheduleSave()
    return true
  }

  function unequipInventoryItem(itemId: string) {
    const current = state.player
    if (!current || !unequipItem(current, itemId)) return false
    current.lifespanMonths = calculateMaxLifespanMonths(current)
    refreshCombatPower(); timeline(`卸下「${itemById(itemId)?.name ?? itemId}」。`, 'loot'); scheduleSave(); return true
  }

  function bindArtifactItem(itemId: string) {
    const current = state.player
    if (!current || !bindArtifact(current, itemId, state.world.currentYear)) return false
    recordLifeMoment(`首次将「${itemById(itemId)?.name ?? itemId}」炼为本命法宝。`, 'inheritance', 4)
    refreshCombatPower(); scheduleSave(); return true
  }

  function unbindArtifactItem() {
    if (!state.player || !unbindArtifact(state.player)) return false
    refreshCombatPower(); scheduleSave(); return true
  }

  function nourishArtifact(amount = 20, affinity = 1) {
    if (!state.player || !nourishBoundArtifact(state.player, amount, affinity)) return false
    refreshCombatPower(); scheduleSave(); return true
  }

  function craftRecipe(recipeId: string) {
    const current = state.player
    if (!current || !craftItem(current, recipeId)) return false
    timeline(`完成「${RECIPES.find((entry) => entry.id === recipeId)?.name ?? '炼制'}」。`, 'loot')
    scheduleSave(); return true
  }

  function equipArtifactFromItem(itemId: string) {
    const current = state.player
    if (!current?.inventory.some((entry) => entry.itemId === itemId && entry.quantity > 0)) return false
    if (itemById(itemId)?.equipmentSlot) return equipInventoryItem(itemId)
    const artifactId = itemId === 'sword' ? 'green-edge-sword' : itemId === 'bell' ? 'soul-bell' : itemId === 'seal' ? 'mountain-armor' : undefined
    const artifact = ARTIFACT_CATALOG.find((entry) => entry.id === artifactId)
    if (!artifact) return false
    current.equippedArtifacts = [...current.equippedArtifacts.filter((entry) => entry.slot !== artifact.slot), { ...artifact }]
    refreshCombatPower()
    timeline(`装备法宝「${artifact.name}」，斗法底蕴有所提升。`, 'loot')
    scheduleSave()
    return true
  }

  function prepareBattleCardFromItem(itemId: string) {
    const current = state.player
    const stack = current?.inventory.find((entry) => entry.itemId === itemId && entry.quantity > 0)
    if (!current || !stack) return false
    const definition = itemById(itemId)
    if (definition?.artifact?.activeEffect) {
      const active = definition.artifact.activeEffect
      const owned = current.battleCards.find((entry) => entry.id === `artifact:${itemId}`)
      if (!owned) current.battleCards.push({ id: `artifact:${itemId}`, name: definition.name, type: 'artifact', description: active.description, powerMultiplier: active.type === 'POWER_BURST' || active.type === 'SOUL_DISRUPTION' ? active.value : 0, defenseMultiplier: active.type === 'PROTECTION' ? active.value : 0, escapeBonus: active.type === 'ESCAPE' ? active.value : 0, lifespanCost: 0, charges: 1 })
      timeline(`祭起法宝「${definition.name}」，已可在下一场斗法中催动。`, 'loot'); scheduleSave(); return true
    }
    const cardId = itemId === 'qi-burst-pill' ? 'qi-burst-pill' : itemId === 'heart-protection-pill' || itemId === 'qi-pill' || itemId === 'spirit-dew' ? 'life-saving-pill' : undefined
    const card = cardId === 'qi-burst-pill' ? { id: 'qi-burst-pill', name: '爆气丹', type: 'pill' as const, description: '丹力骤然爆发，战后经脉疲惫。', powerMultiplier: .15, defenseMultiplier: -.04, escapeBonus: 0, lifespanCost: 0, charges: 1 } : BATTLE_CARD_CATALOG.find((entry) => entry.id === cardId)
    if (!card) return false
    stack.quantity--
    if (stack.quantity <= 0) current.inventory = current.inventory.filter((entry) => entry.itemId !== itemId)
    const owned = current.battleCards.find((entry) => entry.id === card.id)
    if (owned) owned.charges++
    else current.battleCards.push({ ...card })
    timeline(`将丹药炼作斗法底牌「${card.name}」。`, 'loot')
    scheduleSave()
    return true
  }

  async function resetGame() { await SaveService.remove(); replaceState(emptySave()) }

  type DebugAction = 'cultivation' | 'stones' | 'age' | 'age80' | 'age90' | 'age99' | 'event' | 'lifeEvent' | 'lifeEventPool' | 'addFateTag' | 'removeFateTag' | 'fateProgress' | 'lifeTimeline' | 'jumpAge' | 'death' | 'points' | 'unlockTalents' | 'descendant' | 'adultDescendants' | 'secret' | 'toggleGeneration' | 'hall' | 'pathDao' | 'pathSword' | 'pathBody' | 'pathDemonic' | 'pathGhost' | 'pathExperience' | 'swordIntent' | 'qiBlood' | 'demonicNature' | 'innerDemon' | 'karma' | 'soulStability' | 'majorLifespan' | 'rootTreasure' | 'rootTribulation' | 'rootInheritance' | 'rootBloodline' | 'rootTheft' | 'rootReincarnation' | 'rootPurify' | 'rootStabilize' | 'elementGrowth' | 'elements80' | 'balance90' | 'triggerFiveInsight' | 'grantFiveUnity' | 'checkAcquiredTalents' | 'unlockAcquiredTalents' | 'unlockTechniques' | 'techniqueExperience' | 'techniqueAffinity' | 'nearDeath' | 'breakthroughReady' | 'simulateBreakthrough' | 'addResources' | 'addInjury' | 'addInnerDemonState' | 'forceEnlightenment' | 'forceAdventure' | 'highRiskEvent' | 'inheritanceEvent' | 'positiveFate' | 'negativeFate' | 'simulateCombatDeath' | 'luckHigh' | 'luckLow' | 'riskLevel' | 'createSect' | 'joinSect' | 'generateNpc' | 'modifyRelationship' | 'createCultivationFamily' | 'changeSectRelation' | 'advanceNpcAge'
  type CombatDebugAction = 'forceCombat' | 'adventureWolfCombat' | 'lifeRogueCombat' | 'sectSparringCombat' | 'setEnemyPower' | 'setPlayerPower' | 'simulateCombatVictory' | 'simulateCombatDefeat' | 'simulateCombatEscape' | 'addArtifact' | 'addSecretArt' | 'testBattleCard' | 'skipCombatAnimation' | 'v6Equipment' | 'v6Artifact' | 'v6Pill' | 'v6Material' | 'v6Equip' | 'v6Unequip' | 'v6Bind' | 'v6Nourish' | 'v6Affinity' | 'v6Toxicity' | 'v6FoundationPill' | 'v6LongevityPill' | 'v6HealingPill' | 'v6RootPill' | 'v6OpenRealm' | 'v6EnterRealm' | 'v6RealmDepth' | 'v6RealmCombat' | 'v6RealmReward' | 'v6RealmEvent' | 'v6RealmEscape' | 'v6RealmClear' | 'v6RealmDeath'
  function debug(action: DebugAction | CombatDebugAction) {
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
    if (action === 'highRiskEvent') { state.pendingEvent = null; state.pendingLifeEvent = null; triggerLifeEvent('ancient-cultivator-cave') }
    if (action === 'inheritanceEvent') { state.pendingEvent = null; state.pendingLifeEvent = null; triggerLifeEvent('ancient-stele-inheritance') }
    if (action === 'positiveFate') addFateTag(current, { id: 'SAVED_ELDER', name: '救命之恩', description: '曾在危难中救下一位身份不明的老人。', createdAt: state.world.currentYear })
    if (action === 'negativeFate') addFateTag(current, { id: 'KILLED_DISCIPLE', name: '杀徒之仇', description: '夺宝杀人所结下的血债，终有一日会被追索。', createdAt: state.world.currentYear })
    if (action === 'simulateCombatDeath') die('遭强敌截杀，力战而亡', { category: 'combat', description: '遭强敌截杀，力战而亡' })
    if (action === 'luckHigh') current.stats.luck = Math.min(current.statPotential.luck, 95)
    if (action === 'luckLow') current.stats.luck = 10
    if (action === 'riskLevel') ready.debugSecret = lifeEventPool().map(({ event: entry }) => `${entry.name}：风险 ${entry.riskLevel} / 奖励 ${entry.rewardLevel}`).join('\n') || '当前事件池为空。'
    if (action === 'createSect') state.world.sects.push(createSect(crypto.randomUUID(), `无名山门${state.world.sects.length + 1}`, '散修联盟', 1, '荒山', random))
    if (action === 'joinSect' && !current.sectMembership) { current.realmIndex = Math.max(1, current.realmIndex); joinPlayerSect(state.world.sects[0]?.id ?? '') }
    if (action === 'generateNpc') state.world.npcCultivators.push(generateNPCCultivator(random, state.world.currentYear, currentSect.value ?? state.world.sects[0]))
    if (action === 'modifyRelationship') {
      const npc = state.world.npcCultivators.find((entry) => entry.alive)
      if (npc) changePlayerRelationship(npc.id, relationshipBetween(state.world.relationships, current.id, npc.id)?.type === '好友' ? '敌对' : '好友', 50)
    }
    if (action === 'createCultivationFamily') { current.realmIndex = Math.max(11, current.realmIndex); establishCultivationFamily(`${current.name.slice(0, 1)}氏仙族`) }
    if (action === 'changeSectRelation' && state.world.sectRelations[0]) changeSectRelation(state.world.sectRelations[0], state.world.sectRelations[0].type === '敌对' ? 100 : -100, state.world.currentYear)
    if (action === 'advanceNpcAge') for (const npc of state.world.npcCultivators) simulateNPCCultivator(npc, 120, state.world.currentYear + 10, random)
    if (action === 'forceCombat') { state.pendingEvent = null; state.pendingLifeEvent = null; state.pendingCombat = null; startCombat('beast', 0, 'debug', '调试演武场') }
    if (action === 'adventureWolfCombat') { state.pendingEvent = null; state.pendingLifeEvent = null; state.pendingCombat = null; startCombat('beast', 0, 'adventure', '青云山脉', undefined, { sourceType: 'ADVENTURE', sourceId: 'debug-wolf', location: '青云山脉', riskLevel: 2, mode: 'overlay', returnState: { label: '继续历练' } }) }
    if (action === 'lifeRogueCombat') { state.pendingEvent = null; state.pendingCombat = null; triggerLifeEvent('rogue-cultivator-ambush') }
    if (action === 'sectSparringCombat') {
      state.pendingEvent = null; state.pendingLifeEvent = null; state.pendingCombat = null
      const npc = sectPeers.value[0]
      if (npc) startNPCCombat(npc.id, 'sect')
      else ready.debugSecret = '当前宗门没有可切磋的同期修士。'
    }
    if (action === 'setEnemyPower' && state.pendingCombat) state.pendingCombat.enemy.combatPower = Math.max(50, refreshCombatPower() * 2)
    if (action === 'setPlayerPower') {
      current.equippedArtifacts = current.equippedArtifacts.filter((entry) => entry.id !== 'debug-power-seal')
      current.equippedArtifacts.push({ id: 'debug-power-seal', name: '调试战印', slot: 'special', attack: 500, defense: 500, power: 1000, specialEffect: '调试战力增幅' })
      refreshCombatPower()
    }
    if (action === 'simulateCombatVictory') resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'victory')
    if (action === 'simulateCombatDefeat') resolvePendingCombat(CombatStrategy.BALANCED, undefined, 'defeat')
    if (action === 'simulateCombatEscape') resolvePendingCombat(CombatStrategy.ESCAPE, undefined, 'escape')
    if (action === 'skipCombatAnimation') ready.combatAnimationSkipToken++
    if (action === 'addArtifact') {
      const artifact = ARTIFACT_CATALOG.find((entry) => !current.equippedArtifacts.some((owned) => owned.id === entry.id)) ?? ARTIFACT_CATALOG[0]
      current.equippedArtifacts = [...current.equippedArtifacts.filter((entry) => entry.slot !== artifact.slot), { ...artifact }]
      refreshCombatPower()
    }
    if (action === 'addSecretArt') {
      const card = BATTLE_CARD_CATALOG.find((entry) => !current.battleCards.some((owned) => owned.id === entry.id)) ?? BATTLE_CARD_CATALOG[0]
      const owned = current.battleCards.find((entry) => entry.id === card.id)
      if (owned) owned.charges++
      else current.battleCards.push({ ...card })
    }
    if (action === 'testBattleCard') {
      const card = BATTLE_CARD_CATALOG.find((entry) => entry.id === 'blood-burning')!
      const owned = current.battleCards.find((entry) => entry.id === card.id)
      if (owned) owned.charges++
      else current.battleCards.push({ ...card })
    }
    if (action === 'v6Equipment') addItem('green-edge-weapon')
    if (action === 'v6Artifact') addItem('frost-edge-sword')
    if (action === 'v6Pill') addItem('healing-pill', 3)
    if (action === 'v6Material') { addItem('green-spirit-herb', 10); addItem('black-iron', 5); addItem('beast-bone', 5) }
    if (action === 'v6Equip') { addItem('frost-edge-sword'); equipInventoryItem('frost-edge-sword') }
    if (action === 'v6Unequip' && current.equipment.weapon) unequipInventoryItem(current.equipment.weapon)
    if (action === 'v6Bind') { current.realmIndex = Math.max(11, current.realmIndex); addItem('frost-edge-sword'); bindArtifactItem('frost-edge-sword') }
    if (action === 'v6Nourish') nourishArtifact(100, 5)
    if (action === 'v6Affinity' && current.boundArtifact) current.boundArtifact.affinity = Math.min(100, current.boundArtifact.affinity + 10)
    if (action === 'v6Toxicity') current.pillToxicity = 80
    if (action === 'v6FoundationPill') addItem('foundation-pill')
    if (action === 'v6LongevityPill') { addItem('longevity-pill'); useItem('longevity-pill') }
    if (action === 'v6HealingPill') { addCharacterState(current, CharacterState.SERIOUS_INJURY); addItem('healing-pill'); useItem('healing-pill') }
    if (action === 'v6RootPill') { if (!current.spiritualAptitude.acquiredRoots.some((root) => root.element === '火')) acquireSpiritRoot(current.spiritualAptitude, '火', 55, 60, '调试台', state.world.currentYear, state.world.currentMonth); addItem('fire-root-pill'); useItem('fire-root-pill') }
    if (action === 'v6OpenRealm') openSecretRealm(current.secretRealmStates, 'myriad-sword', '调试台', state.world.currentYear + 99)
    if (action === 'v6EnterRealm') { state.secretRealmRun = null; openSecretRealm(current.secretRealmStates, 'azure-cloud', '调试台'); enterSecretRealm('azure-cloud') }
    if (action === 'v6RealmDepth' && state.secretRealmRun) state.secretRealmRun.currentDepth = Math.min((activeSecretRealm.value?.maxDepth ?? 1) - 1, state.secretRealmRun.currentDepth + 1)
    if (action === 'v6RealmCombat' && state.secretRealmRun) { state.secretRealmRun.awaitingDecision = false; const realm = activeSecretRealm.value; if (realm) { const target = realm.encounters.find((entry) => entry.type === 'COMBAT'); if (target) { state.secretRealmRun.currentDepth = Math.max(0, realm.encounters.indexOf(target)); exploreSecretRealm() } } }
    if (action === 'v6RealmReward' && state.secretRealmRun) { state.secretRealmRun.pendingEncounter = { id: 'debug-reward', name: '调试宝库', description: '调试奖励层', type: 'TREASURE', risk: 0, rewards: [{ itemId: 'five-element-stone', quantity: 3 }] }; resolveSecretRealmEncounter() }
    if (action === 'v6RealmEvent' && state.secretRealmRun) { state.secretRealmRun.pendingEncounter = { id: 'debug-event', name: '调试石碑', description: '调试事件层', type: 'EVENT', risk: 0, rewards: [{ itemId: 'five-element-pill', quantity: 1 }] }; resolveSecretRealmEncounter() }
    if (action === 'v6RealmEscape') leaveSecretRealm()
    if (action === 'v6RealmClear' && state.secretRealmRun) { state.secretRealmRun.status = 'CLEARED'; leaveSecretRealm() }
    if (action === 'v6RealmDeath') failSecretRealm('调试秘境死劫')
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
    const debugRoots: Partial<Record<DebugAction | CombatDebugAction, [SpiritElement, string]>> = { rootTreasure: ['土', '天材地宝'], rootTribulation: ['雷', '雷劫淬体'], rootInheritance: ['冰', '秘境传承'], rootBloodline: ['风', '血脉觉醒'], rootTheft: ['暗', '魔道夺灵'], rootReincarnation: ['光', '轮回残留'] }
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
    state, ready, player, currentRealm, breakthroughChance, breakthroughRequirements, pendingEvent, pendingLifeEvent, pendingCombat, combatPower, combatAssessment, currentSect, currentSectOfferings, sectPeers, ageYears, remainingYears, agingStatus, canBecomeGhost, eligibleDescendants, isFirstGeneration, activeSecretRealm, availableSecretRealms,
    initialize, createCharacter, cultivate, adventure, advanceYear, breakthrough, chooseEvent, chooseLifeEvent, closeEventResult, triggerRandomEvent, triggerLifeEvent, lifeEventPool, continueAsDescendant,
    enterReincarnationHall, beginReincarnationCreation, purchaseFate, canPurchaseFate: (purchase: FatePurchase) => canPurchaseFate(state.reincarnation, purchase),
    modifyStat, selectPrimaryPath, selectSecondaryPath, pathPractice, bloodRite, becomeGhost, finalizeMortalDeath, regenerateWorld, debugWorld, useItem,
    learnTechnique, selectTechnique, improveAcquiredRoot, joinPlayerSect, donateSectResources, exchangeSectTechnique, exchangeSectOffering, chooseMaster, changePlayerRelationship, establishCultivationFamily, equipArtifactFromItem, equipInventoryItem, unequipInventoryItem, bindArtifactItem, unbindArtifactItem, nourishArtifact, prepareBattleCardFromItem, craftRecipe,
    enterSecretRealm, exploreSecretRealm, continueSecretRealm, leaveSecretRealm, failSecretRealm,
    startCombat, startNPCCombat, resolvePendingCombat, refreshCombatPower, battleCardCatalog: BATTLE_CARD_CATALOG, artifactCatalog: ARTIFACT_CATALOG, techniqueCatalog: TECHNIQUES, actionCatalog: CULTIVATION_ACTIONS, manualSave, resetGame, replaceState, debug,
  }
})
