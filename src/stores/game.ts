import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { calculateBreakthroughChance, canBreakthrough } from '../core/breakthrough/breakthrough'
import { calculateCultivationGain } from '../core/cultivation/cultivation'
import { rollLoot } from '../core/loot/loot'
import { random } from '../core/random/RandomService'
import { calculateReincarnationPoints, createLifeRecord, initialReincarnation, type UpgradeKey, UPGRADE_CONFIG, upgradeCost } from '../core/reincarnation/reincarnation'
import { SaveService } from '../core/save/SaveService'
import { addMonths } from '../core/time/time'
import { createWorld, simulateWorld } from '../core/world/world'
import { eventById, GAME_EVENTS } from '../data/events'
import { itemById } from '../data/items'
import { ORIGINS } from '../data/origins'
import { isMajorBreakthrough, REALMS, realmName } from '../data/realms'
import { TALENTS } from '../data/talents'
import type { EventEffect, GameSave, LogEntry, Player, SpiritRoot, StatKey, TimelineEvent } from '../models'

const ROOTS: Array<SpiritRoot & { weight: number }> = [
  { id: 'five', name: '五灵根', rank: 1, multiplier: 0.86, elements: ['金', '木', '水', '火', '土'], weight: 5 },
  { id: 'four', name: '四灵根', rank: 2, multiplier: 0.95, elements: ['木', '水', '火', '土'], weight: 10 },
  { id: 'three', name: '三灵根', rank: 3, multiplier: 1.08, elements: ['金', '水', '土'], weight: 20 },
  { id: 'dual', name: '水木双灵根', rank: 4, multiplier: 1.22, elements: ['水', '木'], weight: 30 },
  { id: 'single', name: '纯阳单灵根', rank: 5, multiplier: 1.4, elements: ['火'], weight: 25 },
  { id: 'variant', name: '风雷异灵根', rank: 6, multiplier: 1.62, elements: ['风', '雷'], weight: 8 },
  { id: 'heaven', name: '混元天灵根', rank: 7, multiplier: 1.9, elements: ['混元'], weight: 2 },
]

function emptySave(): GameSave {
  const now = new Date().toISOString()
  return {
    id: 'main', version: 1, createdAt: now, updatedAt: now, player: null, world: createWorld(), lifeRecords: [],
    reincarnation: initialReincarnation(), settings: { fortunateMode: true, autoSave: true, logLimit: 120 },
    pity: { rollsWithoutRare: 0, rollsWithoutEpic: 0 }, logs: [], pendingEvent: null,
  }
}

function cloneTalentChanges(player: Player) {
  for (const talent of player.talents) {
    for (const [key, value] of Object.entries(talent.statChanges ?? {}) as [StatKey, number][]) player.stats[key] += value
  }
}

export const useGameStore = defineStore('game', () => {
  const state = reactive<GameSave>(emptySave())
  const ready = reactive({ loaded: false, saving: false, lastSaved: '' })
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const player = computed(() => state.player)
  const currentRealm = computed(() => state.player ? REALMS[state.player.realmIndex] : REALMS[0])
  const breakthroughChance = computed(() => state.player ? calculateBreakthroughChance(state.player) : null)
  const pendingEvent = computed(() => state.pendingEvent ? eventById(state.pendingEvent.eventId) : undefined)
  const ageYears = computed(() => Math.floor((state.player?.ageMonths ?? 0) / 12))
  const remainingYears = computed(() => Math.max(0, Math.ceil(((state.player?.lifespanMonths ?? 0) - (state.player?.ageMonths ?? 0)) / 12)))

  function replaceState(save: GameSave) { Object.assign(state, structuredClone(save)) }
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

  function createCharacter(name: string) {
    const generation = state.lifeRecords.length + 1
    const origin = random.pick(ORIGINS)
    const rootLuck = state.reincarnation.upgrades.spiritRootLuck * 2 + origin.rootLuck
    const root = random.weightedRandom(ROOTS.map(({ weight, ...value }) => ({ value, weight: weight * (1 + Math.max(0, value.rank - 3) * rootLuck / 45) })))
    const talentCount = random.chance(0.72) ? 2 : 1
    const talents = [...TALENTS].sort(() => random.random() - 0.5).slice(0, talentCount)
    const baseStats = { comprehension: 48, luck: 52, constitution: 50, soul: 48, charm: 48 }
    for (const [key, value] of Object.entries(origin.statChanges) as [StatKey, number][]) baseStats[key] += value
    baseStats.comprehension += state.reincarnation.upgrades.comprehensionBonus * 2
    baseStats.luck += state.reincarnation.upgrades.luckBonus * 2
    baseStats.constitution += state.reincarnation.upgrades.constitutionBonus * 2
    const playerData: Player = {
      id: crypto.randomUUID(), name: name.trim() || random.pick(['沈砚', '林昭', '顾长风', '苏问雪', '江照夜', '叶知秋']), generation,
      birthYear: state.world.currentYear - 16, ageMonths: 16 * 12, lifespanMonths: REALMS[0].baseLifespanYears * 12,
      realmIndex: 0, cultivation: 0, cultivationRequired: REALMS[0].cultivationRequired, spiritRoot: root, stats: baseStats,
      spiritStones: origin.stones, inventory: [], talents, origin, alive: true, achievements: [], timeline: [],
    }
    cloneTalentChanges(playerData)
    playerData.lifespanMonths += talents.reduce((sum, talent) => sum + (talent.lifespanYears ?? 0) * 12, 0) + Math.max(0, playerData.stats.constitution - 50) * 2
    state.player = playerData
    state.pendingEvent = null
    timeline(`${playerData.name}生于${origin.name}，十六岁踏上寻仙路。`, 'life')
    timeline(`测得${root.name}，天赋为${talents.map((entry) => entry.name).join('、')}。`, 'life')
    scheduleSave()
  }

  function checkDeath() {
    if (!state.player?.alive) return true
    if (state.player.ageMonths >= state.player.lifespanMonths) {
      die('寿元耗尽')
      return true
    }
    return false
  }

  function advanceTime(months: number) {
    if (!state.player?.alive) return
    simulateWorld(state.world, months, random)
    addMonths(state.world, months)
    state.player.ageMonths += months
    checkDeath()
  }

  function cultivate(months: number) {
    if (!state.player?.alive || state.pendingEvent) return
    const gain = calculateCultivationGain(state.player, months)
    state.player.cultivation += gain
    advanceTime(months)
    if (!state.player.alive) return
    timeline(`${months >= 36 ? '闭关' : '修炼'}${months}个月，修为 +${gain.toLocaleString()}。`, 'life')
    const eventChance = Math.min(0.82, 0.16 + Math.log2(months + 1) * 0.12)
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
    const current = state.player.inventory.find((entry) => entry.itemId === itemId)
    if (current) current.quantity += quantity
    else state.player.inventory.push({ itemId, quantity })
  }

  function applyEffect(effect: EventEffect) {
    const current = state.player
    if (!current) return
    if (effect.type === 'stones') current.spiritStones = Math.max(0, current.spiritStones + (effect.value ?? 0))
    if (effect.type === 'cultivation') current.cultivation += effect.value ?? 0
    if (effect.type === 'lifespan') current.lifespanMonths = Math.max(current.ageMonths + 1, current.lifespanMonths + (effect.value ?? 0))
    if (effect.type === 'stat' && effect.stat) current.stats[effect.stat] += effect.value ?? 0
    if (effect.type === 'item' && effect.itemId) addItem(effect.itemId)
    if (effect.type === 'death') die(effect.text)
    timeline(effect.text, effect.type === 'item' ? 'loot' : 'event')
  }

  function chooseEvent(optionId: string) {
    const event = pendingEvent.value
    const option = event?.options.find((entry) => entry.id === optionId)
    if (!event || !option || !state.player) return
    timeline(`奇遇「${event.title}」：${option.label}。`, 'event')
    for (const effect of option.effects) applyEffect(effect)
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
    timeline(`历练归来，获得${loot.item.quality}「${loot.item.name}」与 ${stones} 枚灵石。`, 'loot')
    if (random.chance(0.32)) triggerRandomEvent()
    scheduleSave()
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
      }
    } else {
      current.cultivation = Math.round(current.cultivation * random.randomInt(65, 88) / 100)
      const lifespanLoss = Math.max(3, current.realmIndex - 6) * random.randomInt(1, 4)
      current.lifespanMonths -= lifespanLoss
      timeline(`破境失败，修为倒退，折损${lifespanLoss}个月寿元。`, 'event')
      const deathRisk = Math.max(0, current.realmIndex - 13) * 0.009
      if (random.chance(deathRisk)) die('突破失败，道基崩毁')
    }
    scheduleSave()
  }

  function die(cause: string) {
    const current = state.player
    if (!current?.alive) return
    current.alive = false
    current.causeOfDeath = cause
    state.pendingEvent = null
    timeline(`${current.name}${cause}，享年${Math.floor(current.ageMonths / 12)}岁。`, 'death')
    const points = calculateReincarnationPoints(current)
    state.reincarnation.totalPoints += points
    state.lifeRecords.unshift(createLifeRecord(current, state.world.currentYear, realmName(current.realmIndex), points))
    void manualSave()
  }

  function beginNextLife(name: string) {
    if (state.player?.alive) return
    const gap = random.randomInt(3, 24) * 12
    simulateWorld(state.world, gap, random)
    addMonths(state.world, gap)
    state.player = null
    createCharacter(name)
  }

  function buyUpgrade(key: UpgradeKey) {
    if (state.player?.alive) return
    const level = state.reincarnation.upgrades[key]
    const config = UPGRADE_CONFIG[key]
    const cost = upgradeCost(key, level)
    if (level >= config.max || state.reincarnation.totalPoints < cost) return
    state.reincarnation.totalPoints -= cost
    state.reincarnation.upgrades[key]++
    scheduleSave()
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

  async function resetGame() {
    await SaveService.remove()
    replaceState(emptySave())
  }

  function debug(action: 'cultivation' | 'stones' | 'age' | 'event' | 'death' | 'points') {
    if (action === 'points') state.reincarnation.totalPoints += 500
    if (!state.player) return
    if (action === 'cultivation') state.player.cultivation += Math.max(1000, state.player.cultivationRequired)
    if (action === 'stones') state.player.spiritStones += 1000
    if (action === 'age') { state.player.ageMonths = Math.max(state.player.ageMonths, state.player.lifespanMonths - 12); timeline('岁月忽然加速，你已至寿元将尽之时。') }
    if (action === 'event') triggerRandomEvent()
    if (action === 'death') die('调试天劫降临')
  }

  return {
    state, ready, player, currentRealm, breakthroughChance, pendingEvent, ageYears, remainingYears,
    initialize, createCharacter, cultivate, adventure, breakthrough, chooseEvent, triggerRandomEvent, beginNextLife,
    buyUpgrade, useItem, manualSave, resetGame, replaceState, debug,
  }
})
