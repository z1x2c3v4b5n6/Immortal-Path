<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { itemById } from '../data/items'
import { PROFESSION_NAMES, professionTitle } from '../data/professions'
import type { Recipe } from '../models'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const tab = ref<'market' | 'auction' | 'professions'>('market')
const category = ref('全部')
const quantity = ref(1)
const selectedListing = ref('')
const bidAmounts = ref<Record<string, number>>({})
const consignmentItemId = ref('')
const consignmentQuantity = ref(1)
const consignmentPrice = ref(100)
const actionMessage = ref('')
const pendingRecipe = ref<Recipe>()
const categories = ['全部', '材料', '丹药', '武器', '防具', '饰品', '法器', '配方']
const listings = computed(() => game.state.market.listings.filter((listing) => category.value === '全部' || itemById(listing.itemId)?.type === category.value))
const selected = computed(() => game.state.market.listings.find((listing) => listing.listingId === selectedListing.value) ?? listings.value[0])
const recipes = computed(() => game.knownProfessionRecipes)
const marketTrend = computed(() => {
  const entries = game.state.market.supplyDemand
  const average = entries.length ? entries.reduce((sum, entry) => sum + entry.trend, 0) / entries.length : 0
  return average > .08 ? '需求走强' : average < -.08 ? '供给充足' : '总体平稳'
})
const consignmentItems = computed(() => game.player?.inventory.filter((stack) => {
  const item = itemById(stack.itemId)
  return stack.quantity > 0 && item && item.category !== 'QUEST'
}) ?? [])
const itemName = (id: string) => itemById(id)?.name ?? id
const buy = () => selected.value && game.buyMarketItem(selected.value.listingId, quantity.value)
const sell = () => selected.value && game.sellMarketItem(selected.value.listingId, quantity.value)
const consign = () => {
  if (!consignmentItemId.value) return
  const result = game.consignAuctionItem(consignmentItemId.value, consignmentQuantity.value, consignmentPrice.value)
  actionMessage.value = result.ok ? `寄拍成功，已收取 ${result.listingFee} 灵石寄拍费。` : result.reason
}
const confirmCraft = () => {
  if (!pendingRecipe.value) return
  const result = game.craftProfession(pendingRecipe.value.id)
  actionMessage.value = result?.message ?? '炼制条件不足。'
  pendingRecipe.value = undefined
}
onMounted(() => game.refreshMarketNow())
</script>

<template>
  <div class="view-page market-page">
    <header class="page-head"><div><p class="eyebrow">CULTIVATION ECONOMY</p><h1>坊市与百业</h1><p>资源会随世界风闻、供需和你的交易发生变化。</p><small>玄历 {{ game.state.world.currentYear }} 年 · 市场指数 {{ game.state.economy.marketIndex.toFixed(2) }} · {{ marketTrend }}</small></div><div class="wealth"><small>持有灵石</small><strong>{{ game.player?.spiritStones.toLocaleString() ?? 0 }}</strong></div></header>
    <nav class="market-tabs"><button :class="{ active: tab === 'market' }" @click="tab='market'">坊市</button><button :class="{ active: tab === 'auction' }" @click="tab='auction'; game.openAuction()">拍卖</button><button :class="{ active: tab === 'professions' }" @click="tab='professions'">百业</button></nav>

    <template v-if="tab === 'market'">
      <section class="panel rumor"><b>市场风闻</b><span v-if="!game.state.market.rumors.length">坊间暂且平静，价格主要受供需影响。</span><span v-for="rumor in game.state.market.rumors" :key="rumor.id">【{{ rumor.text }}】影响 {{ rumor.tags.join('、') }}</span></section>
      <div class="market-layout">
        <aside class="panel categories"><button v-for="entry in categories" :key="entry" :class="{ active: category === entry }" @click="category=entry">{{ entry }}</button></aside>
        <section class="panel listing-list"><button v-for="listing in listings" :key="listing.listingId" :class="{ active: selected?.listingId === listing.listingId }" @click="selectedListing=listing.listingId"><span><b>{{ itemName(listing.itemId) }}</b><small>{{ itemById(listing.itemId)?.quality }} · {{ listing.merchantType }}</small></span><span><em>{{ listing.trend > 0 ? '↑' : listing.trend < 0 ? '↓' : '→' }}</em> 买 {{ listing.buyPrice }} / 卖 {{ listing.sellPrice }}<small>库存 {{ listing.quantity }}</small></span></button><p v-if="!listings.length" class="muted">本期没有此类商品。</p></section>
        <aside v-if="selected" class="panel listing-detail"><span class="eyebrow">PRICE DETAIL</span><h2>{{ itemName(selected.itemId) }}</h2><p>{{ itemById(selected.itemId)?.description }}</p><dl><div v-for="reason in selected.reasons" :key="reason.label"><dt>{{ reason.label }}</dt><dd>{{ reason.modifier >= 0 ? '+' : '' }}{{ Math.round(reason.modifier * 100) }}%</dd></div></dl><label>数量 <input v-model.number="quantity" type="number" min="1" :max="Math.max(1, selected.quantity)"></label><div class="actions"><button class="primary" @click="buy">买入</button><button @click="sell">出售</button></div><h4>最近交易</h4><p v-for="trade in game.player?.tradeHistory.filter(entry => entry.itemId === selected?.itemId).slice(0,5)" :key="trade.id">玄历 {{ trade.year }} · {{ trade.type === 'BUY' ? '买入' : '卖出' }} {{ trade.quantity }} 件，共 {{ trade.totalPrice }} 灵石</p></aside>
      </div>
    </template>

    <template v-else-if="tab === 'auction'">
      <section class="panel auction-head"><div><span class="eyebrow">AUCTION</span><h2>玄历 {{ game.state.auction.year }} 年大型拍卖</h2><p v-if="game.state.auction.status !== 'OPEN'">下一届预计于玄历 {{ game.state.auction.nextAuctionYear }} 年开放。</p></div><b>{{ game.state.auction.status }}</b></section>
      <section class="auction-grid"><article v-for="lot in game.state.auction.lots" :key="lot.id" class="panel lot"><small>{{ lot.sellerType === 'PLAYER' ? '玩家寄拍' : '修仙界委托' }}</small><h3>{{ itemName(lot.itemId) }}</h3><p>当前价 <strong>{{ lot.currentPrice }}</strong> 灵石</p><p>竞价者 {{ lot.bids.length }} · 剩余 {{ lot.remainingRounds }} 轮</p><input v-model.number="bidAmounts[lot.id]" type="number" :min="lot.currentPrice + 1" :placeholder="String(Math.ceil(lot.currentPrice * 1.1))"><div class="actions"><button class="primary" :disabled="lot.status !== 'OPEN'" @click="game.placeAuctionBid(lot.id, bidAmounts[lot.id] || Math.ceil(lot.currentPrice * 1.1))">出价</button><button :disabled="lot.status !== 'OPEN'" @click="game.advanceAuction(lot.id)">推进一轮</button></div><em>{{ lot.status }}</em></article></section>
      <section class="panel consignment"><h3>玩家寄拍</h3><p>已装备、本命绑定及任务物品不可寄拍。寄拍费 1%～2%，成交手续费最低 3.2%，流拍退还原物。</p><div class="consign-form"><select v-model="consignmentItemId"><option value="">选择乾坤袋物品</option><option v-for="stack in consignmentItems" :key="stack.itemId" :value="stack.itemId">{{ itemName(stack.itemId) }} ×{{ stack.quantity }}</option></select><label>数量 <input v-model.number="consignmentQuantity" type="number" min="1"></label><label>起拍价 <input v-model.number="consignmentPrice" type="number" min="10"></label><button class="primary" :disabled="game.state.auction.status !== 'OPEN'" @click="consign">提交寄拍</button></div><p v-if="actionMessage" class="notice">{{ actionMessage }}</p></section>
    </template>

    <template v-else>
      <section class="profession-grid"><article v-for="progress in game.player?.professionProgress" :key="progress.id" class="panel profession"><span class="eyebrow">{{ progress.id }}</span><h2>{{ PROFESSION_NAMES[progress.id] }} · {{ professionTitle(progress.level) }}</h2><strong>{{ progress.level }}</strong><progress :value="progress.level" max="100"/><p>经验 {{ progress.experience }} · 行动 {{ progress.totalActions }} · 成功 {{ progress.successes }}</p></article></section>
      <section class="panel recipe-panel"><div class="section-head"><div><span class="eyebrow">KNOWN RECIPES</span><h2>已知配方</h2></div></div><div class="recipe-grid"><article v-for="recipe in recipes" :key="recipe.id"><h3>{{ recipe.name }}</h3><p>{{ PROFESSION_NAMES[recipe.profession] }} · 难度 {{ recipe.difficulty }}</p><p>材料：{{ recipe.materials.map(m => `${itemName(m.itemId)} ×${m.amount}`).join('、') }}</p><p>成功率：{{ Math.round(game.professionCraftChance(recipe.id) * 100) }}%</p><p>预计产出：{{ itemName(recipe.resultItemId) }} ×1～3</p><button class="primary" @click="pendingRecipe=recipe">炼制</button></article></div><p v-if="actionMessage" class="notice">{{ actionMessage }}</p></section>
      <section v-if="pendingRecipe" class="craft-confirm" role="dialog" aria-modal="true"><div class="panel"><span class="eyebrow">CRAFT CONFIRMATION</span><h2>确认{{ pendingRecipe.profession === 'ALCHEMY' ? '炼丹' : '炼器' }}</h2><p>预计消耗：{{ pendingRecipe.materials.map(m => `${itemName(m.itemId)} ×${m.amount}`).join('、') }}</p><p>成功率：{{ Math.round(game.professionCraftChance(pendingRecipe.id) * 100) }}%</p><p>可能获得：{{ itemName(pendingRecipe.resultItemId) }} ×1～3</p><p class="muted">失败时会按严重程度损失部分或全部材料，高等级百业有机会节约材料。</p><div class="actions"><button @click="pendingRecipe=undefined">取消</button><button class="primary" @click="confirmCraft">确认炼制</button></div></div></section>
    </template>
  </div>
</template>

<style scoped>
.page-head,.auction-head{display:flex;justify-content:space-between;align-items:center}.wealth{text-align:right}.wealth strong{display:block;font-size:2rem;color:#d8b565}.market-tabs{display:flex;gap:8px;margin:14px 0}.market-tabs button.active,.categories button.active,.listing-list button.active{border-color:#d8b565;color:#efd18d}.market-layout{display:grid;grid-template-columns:150px minmax(340px,1fr) minmax(260px,.75fr);gap:14px}.categories{display:flex;flex-direction:column;gap:7px}.listing-list{display:flex;flex-direction:column;gap:7px;max-height:650px;overflow:auto}.listing-list button{display:flex;justify-content:space-between;text-align:left}.listing-list span:last-child{text-align:right}.listing-list small{display:block;color:var(--muted)}.listing-list em{color:#d7ab57}.listing-detail dl div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(200,164,91,.15);padding:6px}.listing-detail label{display:flex;justify-content:space-between;margin:16px 0}.listing-detail input,.lot input,.consign-form input{width:110px}.actions,.consign-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.rumor{display:flex;gap:16px;overflow:auto;margin-bottom:14px}.auction-grid,.profession-grid,.recipe-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.lot strong,.profession>strong{font-size:1.7rem;color:#d8b565}.profession progress{width:100%}.recipe-panel,.consignment{margin-top:14px}.recipe-grid article{border:1px solid rgba(200,164,91,.18);padding:14px}.notice{color:#efd18d}.craft-confirm{position:fixed;inset:0;z-index:50;background:rgba(8,7,5,.78);display:grid;place-items:center;padding:20px}.craft-confirm .panel{width:min(560px,100%);box-shadow:0 18px 60px #000}@media(max-width:1000px){.market-layout{grid-template-columns:1fr}.categories{flex-direction:row;flex-wrap:wrap}.auction-grid,.profession-grid,.recipe-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.auction-grid,.profession-grid,.recipe-grid{grid-template-columns:1fr}}
</style>
