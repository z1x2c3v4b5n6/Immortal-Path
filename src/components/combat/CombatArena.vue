<script setup lang="ts">
import { computed } from 'vue'
import { REALMS } from '../../data/realms'
import { pathById } from '../../data/cultivationPaths'
import { combatVisualProfile, enemyVisualType } from '../../core/combat/combatPresentation'
import type { CombatRecord, CombatRound, PendingCombat } from '../../models'
import { useGameStore } from '../../stores/game'
import CombatantPanel from './CombatantPanel.vue'

const props = defineProps<{ pending: PendingCombat; record?: CombatRecord; currentRound?: CombatRound }>()
const game = useGameStore()
const profile = computed(() => combatVisualProfile(game.player?.primaryPath))
const enemyVisual = computed(() => `enemy-${enemyVisualType(props.pending.enemy)} enemy-path-${props.pending.enemy.path}`)
const playerMax = computed(() => props.record?.playerHealthMax ?? Math.max(100, Math.round((game.combatPower?.total ?? 100) * .78 + (game.player?.stats.constitution ?? 0) * 3)))
const enemyMax = computed(() => props.record?.enemyHealthMax ?? props.pending.enemy.health)
const playerHealth = computed(() => props.currentRound?.playerHealth ?? (props.record ? props.record.playerHealthRemaining ?? playerMax.value : playerMax.value))
const enemyHealth = computed(() => props.currentRound?.enemyHealth ?? (props.record ? props.record.enemyHealthRemaining ?? enemyMax.value : enemyMax.value))
const heavy = computed(() => !!props.currentRound && props.currentRound.damage > (props.currentRound.actor === 'player' ? enemyMax.value : playerMax.value) * .18)
</script>

<template>
  <div class="combat-arena" :class="[{ 'round-active': currentRound }, profile.className, `motion-${profile.motion}`]">
    <CombatantPanel side="player" label="己方" :name="game.player?.name ?? '无名修士'" :realm="game.currentRealm.name" :power="record?.playerPower ?? game.combatPower?.total ?? 0" :health="playerHealth" :health-max="playerMax" :visual-class="profile.className" :subtitle="pathById(game.player?.primaryPath)?.name ?? '道修'" :active="currentRound?.actor === 'player'" :hit="currentRound?.actor === 'enemy'" :heavy="heavy && currentRound?.actor === 'enemy'" />
    <div class="arena-center">
      <div class="combat-energy-line"><i></i><span>{{ currentRound ? `第 ${currentRound.round} 回合` : '气机交锋' }}</span><i></i></div>
      <div class="combat-effect-glyph" :class="{ attacking: currentRound?.actor === 'player', countering: currentRound?.actor === 'enemy', critical: heavy }"><b>{{ currentRound?.actor === 'enemy' ? '袭' : '斗' }}</b><span>{{ currentRound?.actor === 'enemy' ? '敌势来袭' : profile.effectLabel }}</span></div>
      <div class="arena-particles" aria-hidden="true"><i v-for="index in 10" :key="index"></i></div>
    </div>
    <CombatantPanel side="enemy" :label="pending.enemy.type === 'beast' ? '妖兽' : '敌修'" :name="pending.enemy.name" :realm="REALMS[pending.enemy.realmIndex].name" :power="pending.enemy.combatPower" :health="enemyHealth" :health-max="enemyMax" :visual-class="enemyVisual" :subtitle="pathById(pending.enemy.path)?.name ?? pending.enemy.type" :active="currentRound?.actor === 'enemy'" :hit="currentRound?.actor === 'player'" :heavy="heavy && currentRound?.actor === 'player'" />
  </div>
</template>
