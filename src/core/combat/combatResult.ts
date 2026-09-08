import type { CombatOutcome, CombatRecord, Player } from '../../models'

export function combatOutcomeName(outcome: CombatOutcome) {
  return outcome === 'victory' ? '胜利' : outcome === 'defeat' ? '战败脱身' : outcome === 'escape' ? '成功遁走' : '战死'
}

export function unlockBattleAchievements(player: Player, record: CombatRecord) {
  const unlocked: string[] = []
  const grant = (name: string, condition: boolean) => {
    if (condition && !player.battleAchievements.includes(name)) { player.battleAchievements.push(name); player.achievements.push(name); unlocked.push(name) }
  }
  grant('越级挑战者', record.outcome === 'victory' && record.enemyRealmIndex > record.playerRealmIndex)
  grant('百战修士', player.battleStats.battles >= 100)
  grant('妖兽猎人', player.battleStats.beastKills >= 20)
  grant('剑斩强敌', player.primaryPath === 'sword' && record.outcome === 'victory' && record.enemyPower > record.playerPower * 1.15)
  return unlocked
}

export function isLegendaryBattle(record: Pick<CombatRecord, 'outcome' | 'enemyRealmIndex' | 'playerRealmIndex' | 'enemyPower' | 'playerPower'>) {
  return record.outcome === 'victory' && (record.enemyRealmIndex > record.playerRealmIndex || record.enemyPower >= record.playerPower * 1.25)
}
