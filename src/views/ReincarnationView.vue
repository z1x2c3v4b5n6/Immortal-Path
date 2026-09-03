<script setup lang="ts">
import { useRouter } from 'vue-router'
import { FATE_OPTIONS, type FatePurchase } from '../core/reincarnation/reincarnation'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const router = useRouter()
const options = Object.keys(FATE_OPTIONS) as FatePurchase[]
function begin() { game.beginReincarnationCreation(); void router.push('/') }
</script>

<template>
  <div class="view-page reincarnation-page">
    <header class="page-head"><div><p class="eyebrow">轮回点购买的是选择命运的权限</p><h1>轮回殿</h1><p>所有加持仅作用于即将开始的一世，不会无限叠加面板。</p></div><div class="points-orb"><strong>{{ game.state.reincarnation.totalPoints }}</strong><small>轮回点</small></div></header>
    <div v-if="!game.state.reincarnation.inHall" class="notice">{{ game.player?.alive ? '今世尚在人间。轮回殿只向身后之人开启。' : '请先在死亡结算页选择轮回转世。' }}</div>
    <section class="selection-summary panel"><div><span>额外天赋点</span><b>+{{ game.state.reincarnation.selections.extraTalentPoints }}</b></div><div><span>属性上限</span><b>+{{ game.state.reincarnation.selections.statCapBonus }}</b></div><div><span>天赋权限</span><b>{{ game.state.reincarnation.selections.maxTalentQuality }}</b></div><div><span>手选灵根</span><b>{{ game.state.reincarnation.selections.canChooseSingleRoot ? '含单灵根' : '双灵根以上' }} · {{ game.state.reincarnation.selections.maxRootQuality }}</b></div></section>
    <div class="fate-grid"><article v-for="key in options" :key="key" class="fate-card panel"><div><span class="eyebrow">下一世加持</span><h2>{{ FATE_OPTIONS[key].name }}</h2><p>{{ FATE_OPTIONS[key].description }}</p></div><button class="button" :disabled="!game.canPurchaseFate(key)" @click="game.purchaseFate(key)">{{ game.canPurchaseFate(key) ? `参悟 · ${FATE_OPTIONS[key].cost} 点` : '暂不可参悟' }}</button></article></div>
    <footer class="hall-footer"><p>未花费的轮回点将继续保留。</p><button class="primary" :disabled="!game.state.reincarnation.inHall" @click="begin">带着选择进入下一世</button></footer>
  </div>
</template>
