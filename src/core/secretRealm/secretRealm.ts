import { itemById } from '../../data/items'
import { SECRET_REALMS, secretRealmById } from '../../data/secretRealms'
import type { InventoryReward, Player, SecretRealmDefinition, SecretRealmEncounter, SecretRealmHistoryRecord, SecretRealmRun, SecretRealmState } from '../../models'

export const SECRET_REALM_DEATH_LOSS = .5

export function initialSecretRealmStates(): SecretRealmState[] {
  return SECRET_REALMS.map((realm, index) => ({ secretRealmId: realm.id, discovered: index === 0, source: index === 0 ? '初入修仙界时听闻' : '尚未发现' }))
}

export function openSecretRealm(states: SecretRealmState[], realmId: string, source: string, untilYear?: number) {
  const existing = states.find((entry) => entry.secretRealmId === realmId)
  if (existing) { existing.discovered = true; existing.source = source; existing.accessUntilYear = untilYear }
  else states.push({ secretRealmId: realmId, discovered: true, source, accessUntilYear: untilYear })
}

export function canEnterSecretRealm(player: Player, realm: SecretRealmDefinition, year: number) {
  const state = player.secretRealmStates.find((entry) => entry.secretRealmId === realm.id)
  return Boolean(state?.discovered && (state.accessUntilYear === undefined || state.accessUntilYear >= year))
}

export function createSecretRealmRun(realmId: string): SecretRealmRun {
  if (!secretRealmById(realmId)) throw new Error('未知秘境')
  return { secretRealmId: realmId, currentDepth: 0, status: 'ACTIVE', collectedRewards: [], injuries: [], eventHistory: [], awaitingDecision: false }
}

export function nextSecretRealmEncounter(run: SecretRealmRun) {
  const realm = secretRealmById(run.secretRealmId)
  if (!realm || run.status !== 'ACTIVE' || run.awaitingDecision) return undefined
  if (run.currentDepth >= realm.maxDepth) { run.status = 'CLEARED'; return undefined }
  run.currentDepth++
  const encounter = realm.encounters[(run.currentDepth - 1) % realm.encounters.length]
  run.pendingEncounter = { ...encounter, rewards: encounter.rewards.map((entry) => ({ ...entry })) }
  run.eventHistory.push(`第${run.currentDepth}层：${encounter.name}`)
  return run.pendingEncounter
}

export function addSecretRealmRewards(run: SecretRealmRun, rewards: InventoryReward[]) {
  for (const reward of rewards) {
    const stack = run.collectedRewards.find((entry) => entry.itemId === reward.itemId)
    if (stack) stack.quantity += reward.quantity
    else run.collectedRewards.push({ ...reward })
  }
}

export function completeSecretRealmEncounter(run: SecretRealmRun, encounter: SecretRealmEncounter, rewards = encounter.rewards) {
  addSecretRealmRewards(run, rewards.map((reward) => ({ ...reward, quantity: Math.max(1, Math.round(reward.quantity * (1 + (run.currentDepth - 1) * .18))) })))
  run.pendingEncounter = undefined
  run.awaitingDecision = true
  const realm = secretRealmById(run.secretRealmId)
  if (realm && run.currentDepth >= realm.maxDepth) run.status = 'CLEARED'
}

export function continueSecretRealm(run: SecretRealmRun) {
  if (run.status !== 'ACTIVE' || !run.awaitingDecision) return false
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
