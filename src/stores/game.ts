import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough } from '../core/breakthrough/breakthrough'
import { createPlayerFromBuild, generateDescendant } from '../core/creation/creation'
import { calculateCultivationGain } from '../core/cultivation/cultivation'
import { rollLoot } from '../core/loot/loot'
import { random } from '../core/random/RandomService'
import { applyFatePurchase, calculateReincarnationPoints, canPurchaseFate, createLifeRecord, defaultSelections, type FatePurchase, initialReincarnation } from '../core/reincarnation/reincarnation'
import { CURRENT_SAVE_VERSION, migrateSave } from '../core/save/serialization'
import { SaveService } from '../core/save/SaveService'
import { addMonths } from '../core/time/time'
import { createWorld, simulateWorld } from '../core/world/world'
import { eventById, GAME_EVENTS } from '../data/events'
import { itemById } from '../data/items'
import { QUALITY_ORDER } from '../data/lootTables'
import { isMajorBreakthrough, REALMS, realmName } from '../data/realms'
import { TALENTS } from '../data/talents'
import type { CharacterBuild, EventEffect, FamilyState, GameSave, InventoryItem, LogEntry, Player, TimelineEvent } from '../models'

function emptySave(): GameSave {
  const now = new Date().toISOString()
  return {
    id: 'main', version: CURRENT_SAVE_VERSION, createdAt: now, updatedAt: now, player: null, world: createWorld(), lifeRecords: [],
    reincarnation: initialReincarnation(), settings: { fortunateMode: true, autoSave: true, logLimit: 120 },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null,
  }
}

function mergeInventory(target: InventoryItem[], source: InventoryItem[]) {
  for (const item of source) {
    const current = target.find((entry) => entry.itemId === item.itemId)
    if (current) current.quantity += item.quantity
    else target.push({ ...item })
  }
}

export const useGameStore = defineStore('game', () => {
  const state = reactive<GameSave>(emptySave())
  const ready = reactive({ loaded: false, saving: false, lastSaved: '', debugSecret: '' })
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const player = computed(() => state.player)
  const currentRealm = computed(() => state.player ? REALMS[state.player.realmIndex] : REALMS[0])
  const breakthroughChance = computed(() => state.player ? calculateBreakthroughChance(state.player) : null)
  const pendingEvent = computed(() => state.pendingEvent ? eventById(state.pendingEvent.eventId) : undefined)
  const ageYears = computed(() => Math.floor((state.player?.ageMonths ?? 0) / 12))
  const remainingYears = computed(() => Math.max(0, Math.ceil(((state.player?.lifespanMonths ?? 0) - (state.player?.ageMonths ?? 0)) / 12)))
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
    const created = createPlayerFromBuild(build, generation, state.world.currentYear, entryType, familyId, familyName, random, state.reincarnation.selections.carryMemory ? predecessor : undefined)
    state.player = created
    state.world.families.push(createFamily(created))
    state.reincarnation.selections = defaultSelections()
    state.reincarnation.inHall = false
    state.pendingEvent = null
    timeline(`${created.name}生于${created.origin.name}，十六岁踏上寻仙路。`, 'life')
    timeline(`自择${created.spiritRoot.name}，天赋为${created.talents.map((entry) => entry.name).join('、') || '平平无奇'}。`, 'life')
    if (created.originSecret) timeline('身世一栏只留有三个墨字：？？？', 'event')
    scheduleSave()
  }

  function checkDeath() {
    if (!state.player?.alive) return true
    if (state.player.ageMonths >= state.player.lifespanMonths) { die('寿元耗尽'); return true }
    return false
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
    simulateWorld(state.world, months, random)
    addMonths(state.world, months)
    state.player.ageMonths += months
    maybeGenerateDescendant(months)
    checkDeath()
  }

  function cultivate(months: number) {
    if (!state.player?.alive || state.pendingEvent) return
    const gain = calculateCultivationGain(state.player, months)
    state.player.cultivation += gain
    advanceTime(months)
    if (!state.player.alive) return
    timeline(`${months >= 36 ? '闭关' : '修炼'}${months}个月，修为 +${gain.toLocaleString()}。`, 'life')
    const talentEventBonus = state.player.talents.flatMap((talent) => talent.effects).filter((effect) => effect.type === 'eventWeight').reduce((sum, effect) => sum + effect.value, 0)
    const originBonus = state.player.origin.modifiers.filter((modifier) => modifier.type === 'hiddenEvent').reduce((sum, modifier) => sum + modifier.value, 0)
    const eventChance = Math.min(.9, .16 + Math.log2(months + 1) * .12 + talentEventBonus + originBonus * .1)
    if (random.chance(eventChance)) triggerRandomEvent()
    scheduleSave()
  }

  function triggerRandomEvent() {
    if (!state.player?.alive || state.pendingEvent) return
    const eligible = GAME_EVENTS.filter((event) => (event.minRealmIndex ?? 0) <= state.player!.realmIndex)
    const chosen = random.weightedRandom(eligible.map((event) => ({ value: event, weight: event.weight })))
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
    if (effect.type === 'lifespan') current.lifespanMonths = Math.max(current.ageMonths + 1, current.lifespanMonths + value)
    if (effect.type === 'stat' && effect.stat) current.stats[effect.stat] += value
    if (effect.type === 'item' && effect.itemId) addItem(effect.itemId)
    if (effect.type === 'death') die(effect.text)
    timeline(effect.text, effect.type === 'item' ? 'loot' : 'event')
  }

  function chooseEvent(optionId: string) {
    const event = pendingEvent.value
    const option = event?.options.find((entry) => entry.id === optionId)
    if (!event || !option || !state.player) return
    timeline(`奇遇「${event.title}」：${option.label}。`, 'event')
    for (const effect of option.effects) applyEffect(effect, event.id)
    state.pendingEvent = null
    scheduleSave()
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
    if (QUALITY_ORDER.indexOf(loot.item.quality) >= 3) state.reincarnation.rareEventCount++
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
    const chance = calculateBreakthroughChance(current).final
    advanceTime(1)
    if (!current.alive) return
    if (random.chance(chance)) {
      current.realmIndex++
      current.cultivation = Math.max(0, current.cultivation - current.cultivationRequired)
      current.cultivationRequired = REALMS[current.realmIndex].cultivationRequired
      const newRealm = REALMS[current.realmIndex]
      current.lifespanMonths = Math.max(current.lifespanMonths, newRealm.baseLifespanYears * 12 + Math.max(0, current.stats.constitution - 50) * 2)
      timeline(`破境成功，踏入${newRealm.name}！`, 'realm')
      if (isMajorBreakthrough(current.realmIndex)) {
        const achievement = `证得${newRealm.group}`
        if (!current.achievements.includes(achievement)) current.achievements.push(achievement)
        unlockAchievements(current)
      }
    } else {
      current.cultivation = Math.round(current.cultivation * random.randomInt(65, 88) / 100)
      const lifespanLoss = Math.max(3, current.realmIndex - 6) * random.randomInt(1, 4)
      current.lifespanMonths -= lifespanLoss
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
      spiritRoot: structuredClone(descendant.spiritRoot), stats: { ...descendant.stats }, spiritStones: descendant.spiritStones + Math.floor((family?.wealth ?? 0) * .5),
      inventory: structuredClone(descendant.inventory), talents: structuredClone(descendant.talents), talentPoints: descendant.talents.reduce((sum, talent) => sum + talent.cost, 0),
      origin: descendant.origin, familyId: descendant.familyId, bloodline: family?.bloodline ?? deceased.bloodline,
      entryType: 'bloodline', parentId: deceased.id, predecessorName: deceased.name, alive: true, achievements: [], timeline: [],
    }
    if (family) { family.wealth = Math.ceil(family.wealth * .5); mergeInventory(state.player.inventory, family.inventory.map((item) => ({ ...item }))) }
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

  type DebugAction = 'cultivation' | 'stones' | 'age' | 'event' | 'death' | 'points' | 'unlockTalents' | 'descendant' | 'adultDescendants' | 'secret' | 'toggleGeneration' | 'hall'
  function debug(action: DebugAction) {
    if (action === 'points') state.reincarnation.totalPoints += 500
    if (action === 'unlockTalents') state.reincarnation.unlockedTalents = TALENTS.map((talent) => talent.id)
    const current = state.player
    if (!current) { scheduleSave(); return }
    if (action === 'cultivation') current.cultivation += Math.max(1000, current.cultivationRequired)
    if (action === 'stones') current.spiritStones += 1000
    if (action === 'age') { current.ageMonths = Math.max(current.ageMonths, current.lifespanMonths - 12); timeline('岁月忽然加速，你已至寿元将尽之时。') }
    if (action === 'event') triggerRandomEvent()
    if (action === 'descendant') { const child = generateDescendant(current, state.world.currentYear, random); state.world.descendants.push(child); state.world.families.find((family) => family.id === current.familyId)?.memberIds.push(child.id) }
    if (action === 'adultDescendants') state.world.descendants.filter((descendant) => descendant.parents.includes(current.id)).forEach((descendant) => { descendant.ageMonths = Math.max(descendant.ageMonths, 18 * 12) })
    if (action === 'secret') ready.debugSecret = current.originSecret ?? '此人并无隐藏身世。'
    if (action === 'toggleGeneration') { current.generation = current.generation === 1 ? 2 : 1; current.entryType = current.generation === 1 ? 'initial' : 'reincarnation' }
    if (action === 'death') die('调试天劫降临')
    if (action === 'hall') { if (current.alive) die('调试轮回召引'); enterReincarnationHall() }
    scheduleSave()
  }

  return {
    state, ready, player, currentRealm, breakthroughChance, pendingEvent, ageYears, remainingYears, eligibleDescendants, isFirstGeneration,
    initialize, createCharacter, cultivate, adventure, breakthrough, chooseEvent, triggerRandomEvent, continueAsDescendant,
    enterReincarnationHall, beginReincarnationCreation, purchaseFate, canPurchaseFate: (purchase: FatePurchase) => canPurchaseFate(state.reincarnation, purchase),
    useItem, manualSave, resetGame, replaceState, debug,
  }
})
