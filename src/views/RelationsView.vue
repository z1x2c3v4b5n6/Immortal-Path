<script setup lang="ts">
import { computed } from 'vue'
import { REALMS } from '../data/realms'
import { useGameStore } from '../stores/game'

const game = useGameStore()
const rows = computed(() => (game.player ? game.state.world.relationships.filter((entry) => entry.fromId === game.player!.id || entry.toId === game.player!.id).map((relationship) => {
  const npcId = relationship.fromId === game.player!.id ? relationship.toId : relationship.fromId
  return { relationship, npc: game.state.world.npcCultivators.find((entry) => entry.id === npcId) }
}).filter((entry) => entry.npc) : []))
const family = computed(() => game.state.world.families.find((entry) => entry.id === game.player?.familyId))
const descendants = computed(() => game.state.world.descendants.filter((entry) => entry.familyId === game.player?.familyId))
</script>

<template>
  <div class="view-page relations-page">
    <header class="page-head"><div><p class="eyebrow">同道相逢，恩怨随身</p><h1>人际</h1><p>师徒、道友、竞争者与仇敌，都会在往后岁月里留下回响。</p></div><div class="calligraphy">缘</div></header>
    <div v-if="!game.player" class="empty large-empty"><span>缘</span><h2>尚未入世</h2></div>
    <template v-else>
      <section class="panel family-profile" v-if="family"><div class="section-head"><div><span class="eyebrow">血脉相承</span><h3>{{ family.name }}</h3></div><b>{{ family.kind }}</b></div><div class="social-metrics"><article><small>族地</small><b>{{ family.territory }}</b></article><article><small>家族资源</small><b>{{ family.resources }}</b></article><article><small>家族声望</small><b>{{ Math.round(family.fame) }}</b></article><article><small>血脉成员</small><b>{{ family.memberIds.length }}</b></article></div><button v-if="family.kind !== '玩家家族'" class="button" :disabled="game.player.realmIndex < 11" @click="game.establishCultivationFamily(`${game.player.name.slice(0, 1)}氏仙族`)">{{ game.player.realmIndex >= 11 ? '建立修仙家族' : '筑基后可立仙族' }}</button></section>

      <section class="panel"><div class="section-head"><div><span class="eyebrow">道途往来</span><h3>关系名录</h3></div><b>{{ rows.length }} 人</b></div><div v-if="rows.length" class="relationship-list"><article v-for="row in rows" :key="row.relationship.id" :class="`relation-${row.relationship.type}`"><span>{{ row.relationship.type }}</span><div><b>{{ row.npc!.name }}</b><small>{{ REALMS[row.npc!.realmIndex].name }} · {{ row.npc!.personality }} · {{ row.npc!.alive ? row.npc!.position ?? '散修' : '已故' }}</small><p>{{ row.relationship.note }}</p></div><strong>{{ row.relationship.value }}</strong><div class="relation-actions"><button @click="game.changePlayerRelationship(row.npc!.id, '好友', 55)">结交</button><button @click="game.changePlayerRelationship(row.npc!.id, '竞争', 40)">切磋</button><button @click="game.changePlayerRelationship(row.npc!.id, '敌对', -55)">决裂</button></div></article></div><p v-else class="muted">尚未与其他修士结下足以记录的关系。</p></section>

      <section class="panel"><div class="section-head"><div><span class="eyebrow">后世枝叶</span><h3>家族后代</h3></div><b>{{ descendants.length }} 人</b></div><div v-if="descendants.length" class="descendant-social-grid"><article v-for="person in descendants" :key="person.id"><b>{{ person.name }}</b><small>第 {{ person.generation }} 代 · {{ REALMS[person.realmIndex].name }} · {{ person.alive ? '在世' : '已故' }}</small></article></div><p v-else class="muted">家族血脉尚未开枝散叶。</p></section>
    </template>
  </div>
</template>

