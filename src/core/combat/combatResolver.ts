import { CharacterState, CombatStrategy, type BattleCard, type CombatEnemy, type CombatOutcome, type CombatRecord, type CombatRound, type Player, type SpiritElement, type WorldState } from '../../models'
import type { RandomService } from '../random/RandomService'
import { calculateCombatPower } from './combatPower'
import { combatStrategyById } from './combatStrategy'
import { isLegendaryBattle } from './combatResult'
import { equipmentEffectTotal, equippedItems } from '../items/equipment'

export interface CombatResolveOptions { battleCard?: BattleCard; forceOutcome?: CombatOutcome }

const counters: Partial<Record<SpiritElement, SpiritElement[]>> = {
  金: ['木'], 木: ['土'], 土: ['水'], 水: ['火'], 火: ['金', '木'], 雷: ['水'], 冰: ['火'], 光: ['暗'], 暗: ['光'],
}

export function elementalCombatModifier(attacker: SpiritElement[], defender: SpiritElement[]) {
  let score = 0
  for (const element of attacker) for (const target of defender) if (counters[element]?.includes(target)) score += .08
  for (const element of defender) for (const target of attacker) if (counters[element]?.includes(target)) score -= .06
  return Math.max(-.18, Math.min(.22, score))
}

export function environmentCombatModifier(elements: SpiritElement[], path: Player['primaryPath'], environment: string) {
  let value = 0
  if (/火山|赤炎|火/.test(environment) && elements.includes('火')) value += .12
  if (/水域|寒潭|海|河/.test(environment) && (elements.includes('水') || elements.includes('冰'))) value += .12
  if (/阴|古墓|幽冥/.test(environment) && (path === 'ghost' || elements.includes('暗'))) value += .15
  if (/剑冢/.test(environment) && path === 'sword') value += .12
  return value
}

export function combatStrengthLabel(playerPower: number, enemyPower: number) {
  const ratio = playerPower / Math.max(1, enemyPower)
  if (ratio < .48) return '不可力敌'
  if (ratio < .72) return '强敌'
  if (ratio < .92) return '略弱'
  if (ratio <= 1.1) return '势均力敌'
  if (ratio <= 1.4) return '略强'
  return '远强'
}

export function calculateEscapeChance(player: Player, enemy: CombatEnemy, card?: BattleCard) {
  const realmGap = player.realmIndex - enemy.realmIndex
  const statePenalty = player.characterStates.includes(CharacterState.SERIOUS_INJURY) ? -.22 : player.characterStates.includes(CharacterState.INJURED) ? -.08 : 0
  const agilePenalty = enemy.eliteModifiers?.some((modifier) => modifier.id === 'AGILE') ? -.16 : 0
  return Math.max(.08, Math.min(.95, .5 + realmGap * .07 + player.stats.luck / 500 + player.stats.comprehension / 1000 + (player.spiritRoot.elements.includes('风') ? .12 : 0) + (card?.escapeBonus ?? 0) + equipmentEffectTotal(player, 'ESCAPE_CHANCE') + statePenalty + agilePenalty))
}

function pathProfile(player: Player) {
  if (player.primaryPath === 'sword') return { offense: 1.22 + Math.min(.2, player.pathResources.swordIntent / 600), defense: .88, text: '飞剑破空，剑气纵横。' }
  if (player.primaryPath === 'body') return { offense: 1.02, defense: 1.3 + Math.min(.2, player.pathResources.bodyStage * .035), text: '你踏碎地面，以肉身硬撼攻势。' }
  if (player.primaryPath === 'demonic') return { offense: 1.25 + player.pathResources.demonicNature / 700, defense: .84, text: '魔焰骤起，凶煞之气席卷战场。' }
  if (player.primaryPath === 'ghost') return { offense: 1.08 + player.stats.soul / 650, defense: 1.06, text: '阴风掠过，魂术直指对手神识。' }
  return { offense: 1, defense: 1.08, text: '你引动灵气，术法攻守有度。' }
}

export function resolveCombat(player: Player, enemy: CombatEnemy, strategyId: CombatStrategy, environment: string, world: WorldState, rng: RandomService, options: CombatResolveOptions = {}): CombatRecord {
  const strategy = combatStrategyById(strategyId)
  const card = options.battleCard
  const breakdown = calculateCombatPower(player, world)
  const path = pathProfile(player)
  const elements = player.spiritRoot.elements
  const affinity = elementalCombatModifier(elements, enemy.elements)
  const environmentModifier = environmentCombatModifier(elements, player.primaryPath, environment)
  const luckSwing = (player.stats.luck - 50) / 800 + (rng.random() - .5) * .16
  const equipmentOffense = equipmentEffectTotal(player, 'STRATEGY_OFFENSE') + equipmentEffectTotal(player, 'ELEMENT_POWER') + (player.primaryPath === 'sword' ? equipmentEffectTotal(player, 'SWORD_INTENT') : 0)
  const equipmentDefense = equipmentEffectTotal(player, 'STRATEGY_DEFENSE')
  const power = breakdown.total * strategy.offense * path.offense * (1 + affinity + environmentModifier + (card?.powerMultiplier ?? 0) + equipmentOffense + luckSwing) + equipmentEffectTotal(player, 'ATTACK')
  const defense = Math.max(1, breakdown.total * .11 * strategy.defense * path.defense * (1 + (card?.defenseMultiplier ?? 0) + equipmentDefense) + player.equippedArtifacts.reduce((sum, item) => sum + item.defense, 0) + equipmentEffectTotal(player, 'DEFENSE'))
  const enemyPower = enemy.combatPower * (.92 + rng.random() * .16)
  const rounds: CombatRound[] = []
  let playerHealth = Math.max(100, Math.round(breakdown.total * .78 + (player.stats.constitution + equipmentEffectTotal(player, 'CONSTITUTION')) * 3 + equipmentEffectTotal(player, 'COMBAT_HEALTH')))
  let enemyHealth = enemy.health
  const playerHealthMax = playerHealth
  const enemyHealthMax = enemyHealth

  if (strategyId === CombatStrategy.ESCAPE) {
    const escaped = options.forceOutcome ? options.forceOutcome === 'escape' : rng.chance(calculateEscapeChance(player, enemy, card))
    const outcome: CombatOutcome = escaped ? 'escape' : options.forceOutcome ?? (rng.chance(Math.max(.03, .16 + (enemy.combatPower - breakdown.total) / Math.max(100, enemy.combatPower) * .25)) ? 'death' : 'defeat')
    rounds.push({ round: 1, actor: 'player', text: escaped ? '你敛去气息，借地势遁出敌手感知。' : '遁光被对手截断，你被迫承受迎面一击。', damage: 0, playerHealth, enemyHealth })
    const record = { id: crypto.randomUUID(), year: world.currentYear, month: world.currentMonth, enemyName: enemy.name, enemyType: enemy.type, enemyRealmIndex: enemy.realmIndex, playerRealmIndex: player.realmIndex, playerPower: breakdown.total, enemyPower: enemy.combatPower, strategy: strategyId, battleCardName: card?.name, environment, outcome, rounds, summary: escaped ? `避开${enemy.name}，全身而退。` : outcome === 'death' ? `遁逃失败，死于${enemy.name}之手。` : `未能遁走，受创后侥幸脱身。`, legendary: false, playerHealthMax, playerHealthRemaining: outcome === 'death' ? 0 : playerHealth, enemyHealthMax, enemyHealthRemaining: enemyHealth } satisfies CombatRecord
    return record
  }

  const maxRounds = 7
  for (let round = 1; round <= maxRounds && playerHealth > 0 && enemyHealth > 0; round++) {
    const swordResistance = enemy.eliteModifiers?.some((modifier) => modifier.id === 'SWORD_BONE') && player.primaryPath === 'sword' ? .82 : 1
    const playerDamage = Math.max(5, Math.round((power * (.085 + rng.random() * .04) - enemy.defense * (.45 + rng.random() * .25)) * swordResistance))
    enemyHealth = Math.max(0, enemyHealth - playerDamage)
    const equipmentOpening = equippedItems(player).find((item) => item.weaponVisualTag)?.weaponVisualTag ?? equippedItems(player).find((item) => item.artifactVisualTag)?.artifactVisualTag
    rounds.push({ round, actor: 'player', text: round === 1 ? equipmentOpening ?? path.text : player.primaryPath === 'sword' ? '剑势层叠，再次逼近对手命门。' : player.primaryPath === 'body' ? '气血如炉，你挥拳震开护体灵光。' : player.primaryPath === 'demonic' ? '魔气化刃，攻势愈发凶狠。' : player.primaryPath === 'ghost' ? '魂影交错，阴寒术法无声侵袭。' : '灵力流转，术法接踵而至。', damage: playerDamage, playerHealth, enemyHealth })
    if (enemyHealth <= 0) break
    const bloodthirst = enemy.eliteModifiers?.some((modifier) => modifier.id === 'BLOODTHIRSTY') && enemyHealth <= enemyHealthMax * .45 ? 1.28 : 1
    const soulDevour = enemy.eliteModifiers?.some((modifier) => modifier.id === 'SOUL_DEVOURING') && (player.primaryPath === 'ghost' || player.stats.soul >= 75) ? 1.18 : 1
    const enemyDamage = Math.max(4, Math.round((enemyPower * (.08 + rng.random() * .045) - defense * (.36 + rng.random() * .22)) * bloodthirst * soulDevour))
    playerHealth = Math.max(0, playerHealth - enemyDamage)
    rounds.push({ round, actor: 'enemy', text: `${enemy.name}催动杀招，攻势直逼护体灵光。`, damage: enemyDamage, playerHealth, enemyHealth })
  }

  let outcome: CombatOutcome = enemyHealth <= 0 ? 'victory' : playerHealth <= 0 ? 'defeat' : playerHealth >= enemyHealth ? 'victory' : 'defeat'
  if (options.forceOutcome) outcome = options.forceOutcome
  if (outcome === 'defeat' && !options.forceOutcome) {
    const gap = (enemy.combatPower - breakdown.total) / Math.max(100, enemy.combatPower)
    const deathChance = Math.max(.01, Math.min(.7, .05 + gap * .35 + strategy.deathRisk - player.stats.luck / 1200 - strategy.survival - (card?.defenseMultiplier ?? 0) * .25 - equipmentEffectTotal(player, 'INJURY_REDUCTION') * .35))
    if (rng.chance(deathChance)) outcome = 'death'
  }
  const summary = outcome === 'victory' ? `击败${enemy.name}，斗法取胜。` : outcome === 'death' ? `力战不敌，死于${enemy.name}之手。` : `不敌${enemy.name}，重伤脱身。`
  const base = { id: crypto.randomUUID(), year: world.currentYear, month: world.currentMonth, enemyName: enemy.name, enemyType: enemy.type, enemyRealmIndex: enemy.realmIndex, playerRealmIndex: player.realmIndex, playerPower: breakdown.total, enemyPower: enemy.combatPower, strategy: strategyId, battleCardName: card?.name, environment, outcome, rounds, summary }
  return { ...base, legendary: isLegendaryBattle(base), playerHealthMax, playerHealthRemaining: outcome === 'death' ? 0 : playerHealth, enemyHealthMax, enemyHealthRemaining: outcome === 'victory' ? 0 : enemyHealth }
}
