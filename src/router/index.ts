import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue'), meta: { label: '首页' } },
    { path: '/cultivation', component: () => import('../views/CultivationView.vue'), meta: { label: '修炼' } },
    { path: '/adventure', component: () => import('../views/AdventureView.vue'), meta: { label: '历练' } },
    { path: '/secret-realms', component: () => import('../views/SecretRealmView.vue'), meta: { label: '秘境' } },
    { path: '/combat', component: () => import('../views/CombatView.vue'), meta: { label: '战斗' } },
    { path: '/inventory', component: () => import('../views/InventoryView.vue'), meta: { label: '背包' } },
    { path: '/market', component: () => import('../views/MarketView.vue'), meta: { label: '坊市' } },
    { path: '/world', component: () => import('../views/WorldView.vue'), meta: { label: '世界' } },
    { path: '/sect', component: () => import('../views/SectView.vue'), meta: { label: '宗门' } },
    { path: '/relations', component: () => import('../views/RelationsView.vue'), meta: { label: '人际' } },
    { path: '/life', component: () => import('../views/LifeView.vue'), meta: { label: '人生' } },
    { path: '/chronicle', component: () => import('../views/ChronicleView.vue'), meta: { label: '长生录' } },
    { path: '/reincarnation', component: () => import('../views/ReincarnationView.vue'), meta: { label: '轮回' } },
    { path: '/settings', component: () => import('../views/SettingsView.vue'), meta: { label: '设置' } },
  ],
})
