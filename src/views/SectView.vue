<script setup lang="ts">
import { computed } from 'vue'
import { canAccessSectTechnique, canJoinSect, techniqueContributionCost } from '../core/sect/sectManager'
import { sectRankName } from '../core/sect/sect'
import { REALMS } from '../data/realms'
import { techniqueById } from '../data/techniques'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const playerRank = computed(() => game.player ? 1 + game.sectPeers.filter((npc) => npc.realmIndex > game.player!.realmIndex).length : 0)
const master = computed(() => game.state.world.npcCultivators.find((npc) => npc.id === game.player?.masterId))
</script>

<template>
  <div class="view-page sect-page">
    <header class="page-head"><div><p class="eyebrow">山门有序，道统相承</p><h1>宗门</h1><p>选择归属、积累贡献，在同代修士中争得自己的位置。</p></div><div class="calligraphy">宗</div></header>
    <div v-if="!game.player" class="empty large-empty"><span>门</span><h2>尚未入世</h2><p>创建角色后方可择一山门求道。</p></div>
    <template v-else>
      <section v-if="game.currentSect && game.player.sectMembership" class="panel sect-membership">
        <div class="sect-banner"><span class="sect-seal large">{{ game.currentSect.name.slice(0, 1) }}</span><div><p class="eyebrow">{{ sectRankName(game.currentSect.rank) }} · {{ game.currentSect.type }}</p><h2>{{ game.currentSect.name }}</h2><p>{{ game.currentSect.style }}</p></div></div>
        <div class="social-metrics"><article><small>宗门身份</small><b>{{ game.player.sectMembership.position }}</b></article><article><small>当前贡献</small><b>{{ game.player.sectMembership.contribution }}</b></article><article><small>同期名次</small><b>第 {{ playerRank }} 名</b></article><article><small>师承</small><b>{{ master?.name ?? '尚未拜师' }}</b></article></div>
        <div class="sect-actions"><button class="button" :disabled="game.player.spiritStones < 50" @click="game.donateSectResources(50)">上交 50 灵石</button><button class="button" :disabled="game.player.spiritStones < 200" @click="game.donateSectResources(200)">上交 200 灵石</button></div>
      </section>

      <section v-if="game.currentSect && game.player.sectMembership" class="panel"><div class="section-head"><div><span class="eyebrow">藏经阁</span><h3>贡献兑换功法</h3></div></div><div class="sect-offerings"><article v-for="id in game.currentSect.techniqueIds" :key="id"><div><b>《{{ techniqueById(id)?.name ?? id }}》</b><small>{{ techniqueById(id)?.grade }} · 需 {{ techniqueContributionCost(id) }} 贡献<span v-if="!canAccessSectTechnique(game.player, id)"> · 身份不足</span></small></div><button class="button" :disabled="!canAccessSectTechnique(game.player, id) || game.player.knownTechniques.includes(id) || game.player.sectMembership.contribution < techniqueContributionCost(id)" @click="game.exchangeSectTechnique(id)">{{ game.player.knownTechniques.includes(id) ? '已习得' : '兑换' }}</button></article></div></section>

      <section v-if="game.currentSect && game.player.sectMembership" class="panel"><div class="section-head"><div><span class="eyebrow">同代争锋</span><h3>同期修士榜</h3></div><b>{{ game.sectPeers.length }} 人</b></div><div class="peer-ranking"><article class="self"><strong>{{ playerRank }}</strong><div><b>{{ game.player.name }}（你）</b><small>{{ REALMS[game.player.realmIndex].name }} · {{ game.player.sectMembership.position }}</small></div></article><article v-for="(npc, index) in game.sectPeers.slice(0, 20)" :key="npc.id"><strong>{{ index + 1 }}</strong><div><b>{{ npc.name }}</b><small>{{ REALMS[npc.realmIndex].name }} · {{ npc.position }} · {{ npc.personality }}</small></div><button v-if="!game.player.masterId && npc.realmIndex > game.player.realmIndex" class="text-button" @click="game.chooseMaster(npc.id)">拜师</button></article></div></section>

      <section v-else class="sect-selection"><article v-for="sect in game.state.world.sects" :key="sect.id" class="panel sect-choice"><div class="sect-choice-head"><span class="sect-seal">{{ sect.name.slice(0, 1) }}</span><div><small>{{ sectRankName(sect.rank) }} · {{ sect.type }}</small><h2>{{ sect.name }}</h2></div></div><p>{{ sect.style }}</p><dl><div><dt>山门</dt><dd>{{ sect.location }}</dd></div><div><dt>门人</dt><dd>{{ sect.members }}</dd></div><div><dt>声望</dt><dd>{{ sect.fame }}</dd></div><div><dt>资源</dt><dd>{{ sect.resources }}</dd></div></dl><button class="button" :disabled="!canJoinSect(game.player, sect)" @click="game.joinPlayerSect(sect.id)">{{ canJoinSect(game.player, sect) ? '叩问山门' : game.player.realmIndex === 0 && sect.rank > 1 ? '凡身难入' : '暂不收录' }}</button></article></section>
    </template>
  </div>
</template>
