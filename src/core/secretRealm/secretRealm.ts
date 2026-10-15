import { itemById } from '../../data/items'
import { SECRET_REALMS, secretRealmById } from '../../data/secretRealms'
import type { InventoryReward, Player, SecretRealmDefinition, SecretRealmEncounter, SecretRealmHistoryRecord, SecretRealmRouteChoice, SecretRealmRun, SecretRealmState } from '../../models'
import type { RandomService } from '../random/RandomService'

export const SECRET_REALM_DEATH_LOSS = .5

export function initialSecretRealmStates(): SecretRealmState[] {
  return SECRET_REALMS.map((realm, index) => ({ secretRealmId: realm.id, discovered: index === 0, source: index === 0 ? '初入修仙界时听闻' : '尚未发现', firstClearCompleted: false, runsThisLife: 0 }))
}

export function openSecretRealm(states: SecretRealmState[], realmId: string, source: string, untilYear?: number) {
  const existing = states.find((entry) => entry.secretRealmId === realmId)
  if (existing) { existing.discovered = true; existing.source = source; existing.accessUntilYear = untilYear }
  else states.push({ secretRealmId: realmId, discovered: true, source, accessUntilYear: untilYear, firstClearCompleted: false, runsThisLife: 0 })
}

export function canEnterSecretRealm(player: Player, realm: SecretRealmDefinition, year: number) {
  const state = player.secretRealmStates.find((entry) => entry.secretRealmId === realm.id)
  return Boolean(state?.discovered && (state.accessUntilYear === undefined || state.accessUntilYear >= year) && (state.cooldownUntilYear === undefined || state.cooldownUntilYear <= year))
}

export function createSecretRealmRun(realmId: string): SecretRealmRun {
  if (!secretRealmById(realmId)) throw new Error('未知秘境')
  return { secretRealmId: realmId, currentDepth: 0, status: 'ACTIVE', collectedRewards: [], injuries: [], eventHistory: [], awaitingDecision: false }
}

const ROUTES: SecretRealmRouteChoice[] = [
  { id: 'steady-mountain', name: '稳妥山道', description: '绕开最浓烈的杀机，偏向材料与灵药。', riskModifier: -.35, rewardModifier: .08, encounterTags: ['material', 'herb'], hiddenChance: .03 },
  { id: 'blood-stained', name: '血迹石阶', description: '沿着残存战痕向下，强敌与高品质掉落并存。', riskModifier: .55, rewardModifier: .32, encounterTags: ['combat', 'elite'], hiddenChance: .06 },
  { id: 'broken-gate', name: '残破石门', description: '禁制之后气息莫测，或有传承，也可能触动死劫。', riskModifier: .34, rewardModifier: .25, encounterTags: ['inheritance', 'hazard'], hiddenChance: .18 },
  { id: 'spirit-vein', name: '灵脉支流', description: '沿灵气回流处探索，较易获得丹房或五行机缘。', riskModifier: .05, rewardModifier: .18, encounterTags: ['alchemy', 'element'], hiddenChance: .11 },
]

const bossNames: Record<string, string> = { 'azure-cloud': '护境妖王', 'myriad-sword': '古剑傀', 'five-element-ruins': '五行守府灵', 'blood-fiend': '血煞老魔残魂', 'nether-tomb': '墓主阴魂' }

export function secretRealmRoutes(realmId: string, rng: RandomService): SecretRealmRouteChoice[] {
  const preferred = realmId === 'myriad-sword' ? ['blood-stained', 'broken-gate', 'steady-mountain'] : realmId === 'five-element-ruins' ? ['spirit-vein', 'steady-mountain', 'broken-gate'] : ['steady-mountain', 'blood-stained', 'broken-gate', 'spirit-vein']
  const pool = preferred.map((id) => ROUTES.find((entry) => entry.id === id)!).filter(Boolean)
  const chosen: SecretRealmRouteChoice[] = []
  while (pool.length && chosen.length < (rng.chance(.45) ? 3 : 2)) chosen.push(pool.splice(rng.randomInt(0, pool.length - 1), 1)[0])
  return chosen
}

export function nextSecretRealmEncounter(run: SecretRealmRun) {
  const realm = secretRealmById(run.secretRealmId)
  if (!realm || run.status !== 'ACTIVE' || run.awaitingDecision) return undefined
  if (run.currentDepth >= realm.maxDepth) return undefined
  run.currentDepth++
  const encounter = realm.encounters[(run.currentDepth - 1) % realm.encounters.length]
  const boss = run.currentDepth === realm.maxDepth && encounter.type === 'COMBAT'
  const route = run.selectedRoute
  run.pendingEncounter = { ...encounter, name: boss ? bossNames[realm.id] ?? encounter.name : encounter.name, isBoss: boss, visualTag: boss ? `${realm.id}-boss` : undefined, risk: Math.max(0, Math.min(4, encounter.risk + Math.round(route?.riskModifier ?? 0))), rewards: encounter.rewards.map((entry) => ({ ...entry, quantity: Math.max(1, Math.round(entry.quantity * (1 + (route?.rewardModifier ?? 0))) ) })) }
  run.eventHistory.push(`第${run.currentDepth}层：${encounter.name}`)
  run.selectedRoute = undefined
  return run.pendingEncounter
}

export function addSecretRealmRewards(run: SecretRealmRun, rewards: InventoryReward[]) {
  for (const reward of rewards) {
    const stack = run.collectedRewards.find((entry) => entry.itemId === reward.itemId)
    if (stack) stack.quantity += reward.quantity
    else run.collectedRewards.push({ ...reward })
  }
}

export function completeSecretRealmEncounter(run: SecretRealmRun, encounter: SecretRealmEncounter, rewards = encounter.rewards, rng?: RandomService) {
  addSecretRealmRewards(run, rewards.map((reward) => ({ ...reward, quantity: Math.max(1, Math.round(reward.quantity * (1 + (run.currentDepth - 1) * .18))) })))
  run.pendingEncounter = undefined
  run.awaitingDecision = !encounter.isBoss
  const realm = secretRealmById(run.secretRealmId)
  if (encounter.isBoss) { run.bossDefeated = true; run.status = 'CLEARED'; run.eventHistory.push(`击败${encounter.name}，秘境核心的禁制平息。`) }
  else if (realm && run.currentDepth < realm.maxDepth && rng) run.routeChoices = secretRealmRoutes(realm.id, rng)
}

export function continueSecretRealm(run: SecretRealmRun, routeId?: string, rng?: RandomService, player?: Player) {
  if (run.status !== 'ACTIVE' || !run.awaitingDecision) return false
  const route = run.routeChoices?.find((entry) => entry.id === routeId) ?? run.routeChoices?.[0]
  if (!route) return false
  run.selectedRoute = route
  run.eventHistory.push(`选择路线「${route.name}」：${route.description}`)
  const hiddenChance = route.hiddenChance + Math.max(0, (player?.stats.luck ?? 50) - 50) / 1000 + (player?.equipment.artifactSlots.includes('restriction-awl') ? .12 : 0)
  if (rng?.chance(hiddenChance)) {
    run.hiddenLayer = true
    const reward = route.id === 'spirit-vein' ? { itemId: 'five-element-pill', quantity: 1 } : { itemId: 'artifact-embryo', quantity: 1 }
    addSecretRealmRewards(run, [reward])
    run.eventHistory.push(`发现隐藏层「${route.id === 'spirit-vein' ? '古修丹房' : '残缺传承室'}」，获得额外战利品。`)
  }
  run.routeChoices = undefined
  run.awaitingDecision = false
  return true
}

export function escapeSecretRealm(run: SecretRealmRun) {
  if (run.status !== 'ACTIVE' && run.status !== 'CLEARED') return false
  if (run.status !== 'CLEARED') run.status = 'ESCAPED'
  run.pendingEncounter = undefined
  run.awaitingDecision = false
  return true
}

export function loseSecretRealmRewards(run: SecretRealmRun, ratio = SECRET_REALM_DEATH_LOSS) {
  const lost: InventoryReward[] = []
  const kept: InventoryReward[] = []
  for (const reward of run.collectedRewards) {
    const keep = Math.floor(reward.quantity * (1 - ratio))
    const loss = reward.quantity - keep
    if (keep > 0) kept.push({ ...reward, quantity: keep })
    if (loss > 0) lost.push({ ...reward, quantity: loss })
  }
  run.collectedRewards = kept
  run.status = 'FAILED'
  return lost
}

export function secretRealmRisk(playerPower: number, realm: SecretRealmDefinition, depth = 1) {
  const ratio = playerPower / Math.max(1, realm.recommendedCombatPower ?? 1)
  const score = (ratio < .55 ? 4 : ratio < .8 ? 3 : ratio < 1.05 ? 2 : ratio < 1.4 ? 1 : 0) + Math.max(0, depth - 1) * .45
  const level = Math.max(0, Math.min(4, Math.round(score)))
  return { level, label: ['低', '较低', '中等', '高', '极高'][level] }
}

export function rewardPoolSignature(realmId: string) {
  return [...new Set(secretRealmById(realmId)?.encounters.flatMap((entry) => entry.rewards.map((reward) => reward.itemId)) ?? [])]
}

export function rewardValue(rewards: InventoryReward[]) {
  const qualities = ['凡品', '良品', '精品', '稀有', '珍品', '极品', '奇珍', '传说']
  return rewards.reduce((sum, reward) => sum + reward.quantity * Math.max(1, qualities.indexOf(itemById(reward.itemId)?.quality ?? '凡品') + 1), 0)
}

export function createSecretRealmHistory(run: SecretRealmRun, year: number): SecretRealmHistoryRecord {
  return { secretRealmId: run.secretRealmId, year, deepestDepth: run.currentDepth, status: run.status, rewards: run.collectedRewards.map((entry) => ({ ...entry })) }
}
