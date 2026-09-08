<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMainLayout from './components/AppMainLayout.vue'
import EventModal from './components/EventModal.vue'
import { useGameStore } from './stores/game'

const game = useGameStore()
onMounted(() => game.initialize())
</script>

<template>
  <div v-if="!game.ready.loaded" class="loading-screen"><div class="seal">长</div><p>山河载入中……</p></div>
  <div v-else class="app-shell">
    <AppMainLayout><RouterView /></AppMainLayout>
    <EventModal v-if="game.pendingEvent || game.pendingLifeEvent || game.ready.eventResultText" />
  </div>
</template>
