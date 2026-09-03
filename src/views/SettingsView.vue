<script setup lang="ts">
import { ref } from 'vue'
import { deserializeSave, serializeSave } from '../core/save/serialization'
import { useGameStore } from '../stores/game'
const game = useGameStore()
const message = ref('')
const isDev = import.meta.env.DEV

function downloadSave() {
  const blob = new Blob([serializeSave(game.state)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = `长生录-玄历${game.state.world.currentYear}年.json`; link.click(); URL.revokeObjectURL(link.href)
}
async function importSave(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try { game.replaceState(deserializeSave(await file.text())); await game.manualSave(); message.value = '存档已成功载入并升级至 V3.3 / Save V8。' }
  catch (error) { message.value = error instanceof Error ? error.message : '存档读取失败。' }
  input.value = ''
}
async function reset() { if (window.confirm('确定抹去本地存档？导出备份后可再次导入。')) await game.resetGame() }
</script>

<template>
  <div class="view-page settings-page">
    <header class="page-head"><div><p class="eyebrow">执笔者自定其法</p><h1>设置</h1><p>游戏数据仅保存在此设备的 IndexedDB 中，不会连接任何网络服务。</p></div><div class="calligraphy">衡</div></header>
    <section class="panel settings-group"><div><span class="eyebrow">游玩偏好</span><h3>福缘模式</h3><p>提高高品质掉落、隐藏奇遇与保底保护。默认开启，整体体验更偏爽快。</p></div><label class="toggle"><input v-model="game.state.settings.fortunateMode" type="checkbox" @change="game.manualSave" /><span></span>{{ game.state.settings.fortunateMode ? '已开启' : '已关闭' }}</label></section>
    <section class="panel settings-group"><div><span class="eyebrow">落笔成卷</span><h3>自动保存</h3><p>修炼、突破、历练、事件与轮回后自动写入本地存档。</p></div><label class="toggle"><input v-model="game.state.settings.autoSave" type="checkbox" @change="game.manualSave" /><span></span>{{ game.state.settings.autoSave ? '已开启' : '已关闭' }}</label></section>
    <section class="panel save-actions"><div class="section-head"><div><span class="eyebrow">本地存档 · V8</span><h3>存档管理</h3></div></div><div><button class="button" @click="game.manualSave">立即保存</button><button class="button" @click="downloadSave">导出 JSON</button><label class="button file-button">导入存档<input type="file" accept="application/json" @change="importSave" /></label><button class="button danger" @click="reset">删除并重开</button></div><p>当前世界 Seed：{{ game.state.world.seed }}</p><p v-if="message" class="notice">{{ message }}</p></section>
    <section v-if="isDev" class="panel debug-panel"><div class="section-head"><div><span class="eyebrow">仅开发环境</span><h3>天道调试台</h3></div></div><div><button @click="game.debugWorld('regenerate')">重新生成测试大陆</button><button @click="game.debugWorld('addTrait')">添加世界特质</button><button @click="game.debugWorld('removeTrait')">删除世界特质</button><button @click="game.debugWorld('era')">切换世界时代</button><button @click="game.debugWorld('strength')">切换世界强度</button><button @click="game.debug('cultivation')">修为灌顶</button><button @click="game.debug('stones')">+1000 灵石</button><button @click="game.debug('age80')">寿元 80%</button><button @click="game.debug('age90')">寿元 90%</button><button @click="game.debug('age99')">寿元 99%</button><button @click="game.debug('majorLifespan')">测试大境界延寿</button><button @click="game.debug('event')">强制奇遇</button><button @click="game.debug('death')">强制死亡</button><button @click="game.debug('pathDao')">主道：道修</button><button @click="game.debug('pathSword')">主道：剑修</button><button @click="game.debug('pathBody')">主道：体修</button><button @click="game.debug('pathDemonic')">主道：魔修</button><button @click="game.debug('pathGhost')">主道：鬼修</button><button @click="game.debug('pathExperience')">+500 道途经验</button><button @click="game.debug('swordIntent')">+100 剑意</button><button @click="game.debug('qiBlood')">+100 气血</button><button @click="game.debug('demonicNature')">+20 魔性</button><button @click="game.debug('innerDemon')">+20 心魔</button><button @click="game.debug('karma')">+20 业力</button><button @click="game.debug('soulStability')">+20 魂体稳定</button><button @click="game.debug('points')">+500 轮回点</button><button @click="game.debug('unlockTalents')">解锁所有天赋</button><button @click="game.debug('descendant')">生成后代</button><button @click="game.debug('adultDescendants')">强制后代成年</button><button @click="game.debug('secret')">查看隐藏身世</button><button @click="game.debug('toggleGeneration')">切换第一世/后世</button><button @click="game.debug('hall')">强制进入轮回殿</button></div><p v-if="game.ready.debugSecret" class="debug-secret">隐藏身世：{{ game.ready.debugSecret }}</p></section>
    <section v-if="isDev && game.player" class="panel debug-panel"><div class="section-head"><div><span class="eyebrow">V3.1</span><h3>灵根与功法调试</h3></div></div><div><button @click="game.debug('rootTreasure')">后天根：天材地宝</button><button @click="game.debug('rootTribulation')">后天根：雷劫</button><button @click="game.debug('rootInheritance')">后天根：秘境</button><button @click="game.debug('rootBloodline')">后天根：血脉</button><button @click="game.debug('rootTheft')">后天根：夺灵</button><button @click="game.debug('rootReincarnation')">后天根：轮回</button><button @click="game.debug('rootPurify')">提纯后天灵根</button><button @click="game.debug('rootStabilize')">稳固后天灵根</button><button @click="game.debug('elementGrowth')">元素成长 +20</button><button @click="game.debug('elements80')">五行全部 80</button><button @click="game.debug('balance90')">五行平衡 90%</button><button @click="game.debug('triggerFiveInsight')">触发五行顿悟</button><button @click="game.debug('grantFiveUnity')">强制五行归一</button><button @click="game.debug('unlockTechniques')">解锁全部功法</button><button @click="game.debug('techniqueExperience')">主修功法经验</button><button @click="game.debug('techniqueAffinity')">查看契合明细</button><button @click="game.debug('nearDeath')">濒死次数 +1</button><button @click="game.debug('checkAcquiredTalents')">检查后天天赋</button><button @click="game.debug('unlockAcquiredTalents')">解锁全部后天天赋</button></div></section>
    <section v-if="isDev && game.player" class="panel debug-panel"><div class="section-head"><div><span class="eyebrow">V3.2</span><h3>人生与因果调试</h3></div></div><div><button @click="game.debug('lifeEvent')">强制触发人生事件</button><button @click="game.debug('lifeEventPool')">查看当前事件池</button><button @click="game.debug('addFateTag')">添加因果标签</button><button @click="game.debug('removeFateTag')">删除末个因果</button><button @click="game.debug('fateProgress')">增加命运进度</button><button @click="game.debug('lifeTimeline')">查看人生时间线</button><button @click="game.debug('jumpAge')">跳转十年</button></div></section>
    <section v-if="isDev && game.player" class="panel debug-panel"><div class="section-head"><div><span class="eyebrow">V3.3</span><h3>修炼循环调试</h3></div></div><div><button @click="game.debug('cultivation')">增加修为</button><button @click="game.debug('breakthroughReady')">设置突破就绪</button><button @click="game.debug('simulateBreakthrough')">模拟突破</button><button @click="game.debug('addResources')">添加全部资源</button><button @click="game.debug('addInjury')">添加伤势</button><button @click="game.debug('addInnerDemonState')">添加心魔状态</button><button @click="game.debug('forceEnlightenment')">强制悟道</button><button @click="game.debug('forceAdventure')">强制历练收获</button></div></section>
  </div>
</template>
