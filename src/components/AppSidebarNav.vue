<script setup lang="ts">
import { RouterLink } from 'vue-router'

const nav = [
  { to: '/', label: '首页', glyph: '⌂' },
  { to: '/cultivation', label: '修炼', glyph: '炁' },
  { to: '/adventure', label: '历练', glyph: '行' },
  { to: '/combat', label: '战斗', glyph: '战' },
  { to: '/inventory', label: '背包', glyph: '囊' },
  { to: '/world', label: '世界', glyph: '界' },
  { to: '/sect', label: '宗门', glyph: '宗' },
  { to: '/relations', label: '人际', glyph: '缘' },
  { to: '/life', label: '人生', glyph: '命' },
  { to: '/chronicle', label: '长生录', glyph: '录' },
  { to: '/reincarnation', label: '轮回', glyph: '轮' },
  { to: '/settings', label: '设置', glyph: '衡' },
]
</script>

<template>
  <aside class="app-sidebar-nav">
    <RouterLink to="/" class="sidebar-brand" aria-label="长生录首页">
      <span class="brand-mark">长</span>
      <span><b>长生录</b><small>IMMORTAL PATH</small></span>
    </RouterLink>
    <nav aria-label="主导航">
      <RouterLink v-for="item in nav" :key="item.to" :to="item.to" :title="item.label">
        <span class="nav-glyph" aria-hidden="true">{{ item.glyph }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="sidebar-foot">离线修仙志</div>
  </aside>
</template>
