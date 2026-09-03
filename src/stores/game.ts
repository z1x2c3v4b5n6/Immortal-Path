import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough } from '../core/breakthrough/breakthrough'
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
import type { CharacterBuild, CultivationPathId, EventEffect, FamilyState, GameSave, InventoryItem, LogEntry, Player, StatKey, TimelineEvent, WorldEraId, WorldStrengthLevel } from '../models'

function emptySave(): GameSave {
  const now = new Date().toISOString()
  return {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: now, updatedAt: now, player: null, world: createWorld(), lifeRecords: [],
    reincarnation: initialReincarnation(), settings: { fortunateMode: true, autoSave: true, logLimit: 120 },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null,
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
  const pendingEvent = computed(() => state.pendingEvent ? eventById(state.pendingEvent.eventId) : undefined)
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
    ready.eventResultTitle = ''
    ready.eventResultText = ''
    timeline(`${created.name}生于${created.origin.name}，十六岁踏上寻仙路。`, 'life')
    timeline(`自择${created.spiritRoot.name}，天赋为${created.talents.map((entry) => entry.name).join('、') || '平平无奇'}。`, 'life')
    if (created.originSecret) timeline('身世一栏只留有三个墨字：？？？', 'event')
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
  }

  function cultivate(months: number) {
    if (!state.player?.alive || state.pendingEvent) return
    const gain = calculateCultivationGain(state.player, months, state.world)
    state.player.cultivation += gain
    const pathResult = applyPathTraining(state.player, months, state.world)
    if (pathResult.statGrowth?.constitution) modifyStat('constitution', pathResult.statGrowth.constitution, '炼体淬炼肉身')
    if (pathResult.statGrowth?.soul) modifyStat('soul', pathResult.statGrowth.soul, '鬼道温养神魂')
    advanceTime(months)
    if (!state.player.alive) return
    timeline(`${months >= 36 ? '闭关' : '修炼'}${months}个月，修为 +${gain.toLocaleString()}${pathResult.resourceText ? `，${pathResult.resourceText}` : ''}。`, 'life')
    const talentEventBonus = state.player.talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'eventWeight').reduce((sum, effect) => sum + effect.value, 0)
    const originBonus = state.player.origin.modifiers.filter((modifier) => modifier.type === 'hiddenEvent').reduce((sum, modifier) => sum + modifier.value, 0)
    const eventChance = Math.min(.92, (.16 + Math.log2(months + 1) * .12 + talentEventBonus + originBonus * .1) * state.world.continent.cultivationEnvironment.eventFrequencyMultiplier)
    if (random.chance(eventChance)) triggerRandomEvent()
    scheduleSave()
  }

  function triggerRandomEvent() {
    if (!state.player?.alive || state.pendingEvent) return
    const eligible = GAME_EVENTS.filter((event) => (event.minRealmIndex ?? 0) <= state.player!.realmIndex && (!event.pathRequirements?.length || event.pathRequirements.includes(state.player!.primaryPath!)))
    const chosen = random.weightedRandom(eligible.map((event) => {
      const pathId = state.player!.primaryPath
      const pathWeight = pathId ? event.pathWeights?.[pathId] ?? 1 : 1
      const worldPathEvent = pathId ? getWorldModifier(state.world, 'pathEvent', pathId) : 0
      return { value: event, weight: event.weight * pathWeight * (1 + worldPathEvent) }
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
    if (effect.type === 'lifespan') { current.lifespanBonusMonths += value; current.lifespanMonths = calculateMaxLifespanMonths(current) }
    if (effect.type === 'stat' && effect.stat) { modifyStat(effect.stat, value, effect.text); return }
    if (effect.type === 'item' && effect.itemId) addItem(effect.itemId)
    if (effect.type === 'pathExperience' && effect.pathId) addPathExperience(current, effect.pathId, value, current.primaryPath !== effect.pathId)
    if (effect.type === 'pathResource' && effect.resource) {
      current.pathResources[effect.resource] = Math.max(0, current.pathResources[effect.resource] + value)
      if (effect.resource === 'qiBlood') current.pathResources.qiBlood = Math.min(current.pathResources.maxQiBlood, current.pathResources.qiBlood)
    }
    if (effect.type === 'unlockPath' && effect.pathId && !current.unlockedPaths.includes(effect.pathId)) current.unlockedPaths.push(effect.pathId)
    if (effect.type === 'soulStability') current.soulStability = Math.max(0, Math.min(100, (current.soulStability ?? 0) + value))
    if (effect.type === 'death') die(effect.text)
    timeline(effect.text, effect.type === 'item' ? 'loot' : 'event')
  }

  function selectPrimaryPath(pathId: CultivationPathId) {
    const current = state.player
    if (!current || !choosePath(current, pathId)) return false
    timeline(`${current.name}立下道心，以${CULTIVATION_PATHS.find((path) => path.id === pathId)?.name}为此世主道。`, 'realm')
    current.lifespanMonths = calculateMaxLifespanMonths(current)
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
    if (!current?.alive || !current.primaryPath) return
    const result = applyPathTraining(current, 3, state.world)
    if (result.statGrowth?.constitution) modifyStat('constitution', result.statGrowth.constitution, '专修肉身')
    if (result.statGrowth?.soul) modifyStat('soul', result.statGrowth.soul, '温养魂体')
    advanceTime(3)
    if (current.alive) timeline(`专修${CULTIVATION_PATHS.find((path) => path.id === current.primaryPath)?.name}三月，${result.resourceText || `道途经验 +${result.experience}`}。`, 'life')
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
    const outcome = selectEventOutcome(option.outcomes, state.player, random)
    for (const effect of outcome.effects) applyEffect(effect, event.id)
    if (outcome.tags?.includes('rare')) state.reincarnation.rareEventCount++
    ready.eventResultTitle = event.title
    ready.eventResultText = outcome.resultText
    state.pendingEvent = null
    scheduleSave()
  }

  function closeEventResult() {
    ready.eventResultTitle = ''
    ready.eventResultText = ''
  }

  function adventure() {
    if (!state.player?.alive || state.pendingEvent) return
    advanceTime(3)
    if (!state.player.alive) return
    const loot = rollLoot(state.player, state.pity, state.settings.fortunateMode, random)
    state.pity = loot.pity
    addItem(loot.item.id)
    const stones = random.randomInt(6, 20) + state.player.realmIndex * 2
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

  function breakthrough() {
    const current = state.player
    if (!current || !canBreakthrough(current)) return
    const chance = calculateBreakthroughChance(current, state.world).final
    advanceTime(1)
    if (!current.alive) return
    if (random.chance(chance)) {
      const lifespanBefore = current.lifespanMonths
      current.realmIndex++
      current.cultivation = Math.max(0, current.cultivation - current.cultivationRequired)
      current.cultivationRequired = REALMS[current.realmIndex].cultivationRequired
      const newRealm = REALMS[current.realmIndex]
      timeline(`破境成功，踏入${newRealm.name}！`, 'realm')
      if (isMajorBreakthrough(current.realmIndex)) {
        current.lifespanMonths = calculateMaxLifespanMonths(current)
        const achievement = `证得${newRealm.group}`
        if (!current.achievements.includes(achievement)) current.achievements.push(achievement)
        unlockAchievements(current)
        modifyStat('constitution', 2, `突破${newRealm.group}，灵气洗炼肉身`)
        modifyStat('soul', 1, `突破${newRealm.group}，神魂随境界增长`)
        timeline(`肉身得到灵气滋养，生机重新焕发。寿元上限：${Math.floor(lifespanBefore / 12)} → ${Math.floor(current.lifespanMonths / 12)} 年。`, 'realm')
      }
    } else {
      current.cultivation = Math.round(current.cultivation * random.randomInt(65, 88) / 100)
      const baseLoss = Math.max(3, current.realmIndex - 6) * random.randomInt(1, 4)
      const bodyResistance = current.primaryPath === 'body' ? .7 : 1
      const demonicRisk = current.primaryPath === 'demonic' ? 1.6 : 1
      const lifespanLoss = Math.round(baseLoss * bodyResistance * demonicRisk)
      current.lifespanBonusMonths -= lifespanLoss
      current.lifespanMonths = calculateMaxLifespanMonths(current)
      if (current.primaryPath === 'demonic') current.pathResources.innerDemon = Math.min(100, current.pathResources.innerDemon + 10)
      modifyStat('constitution', -1, '破境失败，道基受损')
      timeline(`破境失败，修为倒退，折损${lifespanLoss}个月寿元。`, 'event')
      if (random.chance(Math.max(0, current.realmIndex - 13) * .009)) die('突破失败，道基崩毁')
    }
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
    current.causeOfDeath = cause
    state.pendingEvent = null
    timeline(`${current.name}${cause}，享年${Math.floor(current.ageMonths / 12)}岁。`, 'death')
    preserveFamilyAssets(current)
    const controlledDescendant = state.world.descendants.find((descendant) => descendant.id === current.id)
    if (controlledDescendant) controlledDescendant.alive = false
    const points = calculateReincarnationPoints(current)
    state.reincarnation.totalPoints += points
    unlockAchievements(current)
    state.lifeRecords.unshift(createLifeRecord(current, state.world.currentYear, realmName(current.realmIndex), points))
    void manualSave()
  }

  function becomeGhost() {
    const current = state.player
    if (!current || current.alive || current.primaryPath === 'ghost') return false
    const recordIndex = state.lifeRecords.findIndex((record) => record.playerId === current.id)
    if (recordIndex >= 0) {
      state.reincarnation.totalPoints = Math.max(0, state.reincarnation.totalPoints - state.lifeRecords[recordIndex].pointsEarned)
      state.lifeRecords.splice(recordIndex, 1)
    }
    current.alive = true
    current.causeOfDeath = undefined
    current.unlockedPaths = [...new Set([...current.unlockedPaths, 'ghost'])]
    if (current.primaryPath && !current.secondaryPaths.some((entry) => entry.pathId === current.primaryPath)) {
      const previous = current.pathProgress.find((entry) => entry.pathId === current.primaryPath)
      if (previous) current.secondaryPaths = [{ ...previous }]
    }
    current.primaryPath = 'ghost'
    current.soulStability = 80
    pathProgress(current, 'ghost')
    timeline('肉身虽死，魂魄却拒绝轮回。你以残魂踏上鬼道，往后以魂体稳定维系存在。', 'realm')
    scheduleSave()
    return true
  }

  function continueAsDescendant(id: string) {
    const deceased = state.player
    const descendant = eligibleDescendants.value.find((entry) => entry.id === id)
    if (!deceased || deceased.alive || !descendant) return
    const family = state.world.families.find((entry) => entry.id === descendant.familyId)
    descendant.isPlayer = true
    state.player = {
      id: descendant.id, name: descendant.name, generation: state.lifeRecords.length + 1, birthYear: descendant.birthYear,
      ageMonths: descendant.ageMonths, lifespanMonths: descendant.lifespanMonths, realmIndex: descendant.realmIndex,
      cultivation: descendant.cultivation, cultivationRequired: REALMS[descendant.realmIndex].cultivationRequired,
      spiritRoot: structuredClone(descendant.spiritRoot), stats: { ...descendant.stats }, statPotential: { ...descendant.statPotential }, statHistory: [], spiritStones: descendant.spiritStones + Math.floor((family?.wealth ?? 0) * .5),
      inventory: structuredClone(descendant.inventory), talents: structuredClone(descendant.talents), talentPoints: descendant.talents.reduce((sum, talent) => sum + talent.cost, 0),
      origin: descendant.origin, familyId: descendant.familyId, bloodline: family?.bloodline ?? deceased.bloodline,
      entryType: 'bloodline', parentId: deceased.id, predecessorName: deceased.name, alive: true, achievements: [], timeline: [],
      secondaryPaths: [], pathProgress: [], pathResources: initialPathResources(), unlockedPaths: ['dao', 'sword', 'body'],
      lifespanFateModifier: 0, lifespanBonusMonths: 0,
    }
    state.player.lifespanMonths = calculateMaxLifespanMonths(state.player)
    if (family) { family.wealth = Math.ceil(family.wealth * .5); transferInventory(family.inventory, state.player.inventory) }
    state.reincarnation.inHall = false
    timeline(`${descendant.name}承接${deceased.name}的血脉与遗志，续写家族因果。`, 'life')
    scheduleSave()
  }

  function enterReincarnationHall() {
    if (state.player?.alive || !state.lifeRecords.length) return
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

  type DebugAction = 'cultivation' | 'stones' | 'age' | 'age80' | 'age90' | 'age99' | 'event' | 'death' | 'points' | 'unlockTalents' | 'descendant' | 'adultDescendants' | 'secret' | 'toggleGeneration' | 'hall' | 'pathDao' | 'pathSword' | 'pathBody' | 'pathDemonic' | 'pathGhost' | 'pathExperience' | 'swordIntent' | 'qiBlood' | 'demonicNature' | 'innerDemon' | 'karma' | 'soulStability' | 'majorLifespan'
  function debug(action: DebugAction) {
    if (action === 'points') state.reincarnation.totalPoints += 500
    if (action === 'unlockTalents') state.reincarnation.unlockedTalents = TALENTS.map((talent) => talent.id)
    const current = state.player
    if (!current) { scheduleSave(); return }
    if (action === 'cultivation') current.cultivation += Math.max(1000, current.cultivationRequired)
    if (action === 'stones') current.spiritStones += 1000
    if (action === 'age') { current.ageMonths = Math.max(current.ageMonths, current.lifespanMonths - 12); timeline('岁月忽然加速，你已至寿元将尽之时。') }
    if (action === 'age80') current.ageMonths = Math.floor(current.lifespanMonths * .8)
    if (action === 'age90') current.ageMonths = Math.floor(current.lifespanMonths * .9)
    if (action === 'age99') current.ageMonths = Math.floor(current.lifespanMonths * .99)
    if (action === 'event') triggerRandomEvent()
    if (action === 'descendant') { const child = generateDescendant(current, state.world.currentYear, random); state.world.descendants.push(child); state.world.families.find((family) => family.id === current.familyId)?.memberIds.push(child.id) }
    if (action === 'adultDescendants') state.world.descendants.filter((descendant) => descendant.parents.includes(current.id)).forEach((descendant) => { descendant.ageMonths = Math.max(descendant.ageMonths, 18 * 12) })
    if (action === 'secret') ready.debugSecret = current.originSecret ?? '此人并无隐藏身世。'
    if (action === 'toggleGeneration') { current.generation = current.generation === 1 ? 2 : 1; current.entryType = current.generation === 1 ? 'initial' : 'reincarnation' }
    if (action === 'death') die('调试天劫降临')
    if (action === 'hall') { if (current.alive) die('调试轮回召引'); enterReincarnationHall() }
    const debugPath = action === 'pathDao' ? 'dao' : action === 'pathSword' ? 'sword' : action === 'pathBody' ? 'body' : action === 'pathDemonic' ? 'demonic' : action === 'pathGhost' ? 'ghost' : undefined
    if (debugPath) { current.primaryPath = undefined; current.unlockedPaths = [...new Set([...current.unlockedPaths, debugPath])]; choosePath(current, debugPath, true); if (debugPath === 'ghost') current.soulStability = 80 }
    if (action === 'pathExperience' && current.primaryPath) addPathExperience(current, current.primaryPath, 500)
    if (action === 'swordIntent') current.pathResources.swordIntent += 100
    if (action === 'qiBlood') { current.pathResources.maxQiBlood += 100; current.pathResources.qiBlood = current.pathResources.maxQiBlood }
    if (action === 'demonicNature') current.pathResources.demonicNature = Math.min(100, current.pathResources.demonicNature + 20)
    if (action === 'innerDemon') current.pathResources.innerDemon = Math.min(100, current.pathResources.innerDemon + 20)
    if (action === 'karma') current.pathResources.karma = Math.min(100, current.pathResources.karma + 20)
    if (action === 'soulStability') current.soulStability = Math.min(100, (current.soulStability ?? 0) + 20)
    if (action === 'majorLifespan') { current.realmIndex = Math.min(REALMS.length - 1, current.realmIndex < 11 ? 11 : current.realmIndex + (4 - (current.realmIndex - 11) % 4)); current.lifespanMonths = calculateMaxLifespanMonths(current) }
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
    state, ready, player, currentRealm, breakthroughChance, pendingEvent, ageYears, remainingYears, agingStatus, canBecomeGhost, eligibleDescendants, isFirstGeneration,
    initialize, createCharacter, cultivate, adventure, breakthrough, chooseEvent, closeEventResult, triggerRandomEvent, continueAsDescendant,
    enterReincarnationHall, beginReincarnationCreation, purchaseFate, canPurchaseFate: (purchase: FatePurchase) => canPurchaseFate(state.reincarnation, purchase),
    modifyStat, selectPrimaryPath, selectSecondaryPath, pathPractice, bloodRite, becomeGhost, regenerateWorld, debugWorld, useItem, manualSave, resetGame, replaceState, debug,
  }
})
