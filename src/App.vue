<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import EventModal from './components/EventModal.vue'
import PlayerSidebar from './components/PlayerSidebar.vue'
import RecentLogs from './components/RecentLogs.vue'
import { formatGameTime } from './core/time/time'
import { useGameStore } from './stores/game'

const game = useGameStore()
const nav = [
  ['/', '洞府', '舍'], ['/cultivation', '修炼', '炁'], ['/adventure', '历练', '行'], ['/inventory', '乾坤袋', '囊'],
  ['/world', '天下', '界'], ['/sect', '宗门', '宗'], ['/relations', '人际', '缘'], ['/life', '人生', '命'], ['/chronicle', '长生录', '录'], ['/reincarnation', '轮回', '轮'], ['/settings', '设置', '衡'],
]
const time = computed(() => formatGameTime(game.state.world))
onMounted(() => game.initialize())
</script>

<template>
  <div v-if="!game.ready.loaded" class="loading-screen"><div class="seal">长</div><p>山河载入中……</p></div>
  <div v-else class="app-shell">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">长</span>
        <span><b>长生录</b><small>IMMORTAL PATH</small></span>
      </RouterLink>
      <div class="world-clock"><span>{{ time }}</span><i></i><span>第 {{ game.player?.generation ?? game.state.lifeRecords.length + 1 }} 世</span></div>
      <div class="save-state"><span :class="{ pulse: game.ready.saving }"></span>{{ game.ready.saving ? '正在落笔' : game.ready.lastSaved ? `${game.ready.lastSaved} 已存` : '本地存档' }}</div>
    </header>
    <aside class="rail">
      <nav>
        <RouterLink v-for="item in nav" :key="item[0]" :to="item[0]" :title="item[1]">
          <span>{{ item[2] }}</span><em>{{ item[1] }}</em>
        </RouterLink>
      </nav>
    </aside>
    <main class="main-grid" :class="{ 'no-player': !game.player }">
      <PlayerSidebar v-if="game.player" />
      <section class="view-frame"><RouterView /></section>
      <RecentLogs v-if="game.player" />
    </main>
    <EventModal v-if="game.pendingEvent || game.pendingLifeEvent || game.ready.eventResultText" />
  </div>
</template>
