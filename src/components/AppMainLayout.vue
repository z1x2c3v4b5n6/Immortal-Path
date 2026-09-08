<script setup lang="ts">
import { ref } from 'vue'
import AppSidebarNav from './AppSidebarNav.vue'
import ContextPanel from './ContextPanel.vue'
import PlayerSidebar from './PlayerSidebar.vue'
import PlayerSummaryBar from './PlayerSummaryBar.vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const detailsOpen = ref(false)
</script>

<template>
  <div class="app-main-layout">
    <AppSidebarNav />
    <div class="app-workspace">
      <PlayerSummaryBar @open-details="detailsOpen = true" />
      <main class="workspace-body" :class="{ 'without-player': !game.player }">
        <section class="view-frame"><slot /></section>
        <ContextPanel v-if="game.player" />
      </main>
    </div>
    <Transition name="drawer-fade">
      <div v-if="detailsOpen && game.player" class="player-detail-backdrop" @click.self="detailsOpen = false">
        <div class="player-detail-drawer" role="dialog" aria-modal="true" aria-label="角色详情">
          <header><div><p class="eyebrow">CHARACTER DOSSIER</p><h2>角色详情</h2></div><button aria-label="关闭角色详情" @click="detailsOpen = false">×</button></header>
          <PlayerSidebar />
        </div>
      </div>
    </Transition>
  </div>
</template>
