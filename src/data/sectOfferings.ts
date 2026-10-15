import type { SectType } from '../models'

export interface SectItemOffering { id: string; itemId?: string; secretRealmId?: string; name: string; cost: number; description: string }

const COMMON: SectItemOffering[] = [{ id: 'common-healing', itemId: 'healing-pill', name: '疗伤丹', cost: 90, description: '行走险地常备之物。' }]
const POOLS: Partial<Record<SectType, SectItemOffering[]>> = {
  剑宗: [{ id: 'sword-weapon', itemId: 'green-edge-weapon', name: '青锋剑', cost: 160, description: '制式飞剑。' }, { id: 'sword-iron', itemId: 'black-iron', name: '玄铁', cost: 45, description: '剑器材料。' }, { id: 'sword-realm', secretRealmId: 'myriad-sword', name: '万剑冢外围名额', cost: 500, description: '开放十年。' }],
  体宗: [{ id: 'body-armor', itemId: 'beast-bone-armor', name: '妖骨甲', cost: 220, description: '体修重甲。' }, { id: 'body-bone', itemId: 'beast-bone', name: '妖兽骨', cost: 50, description: '炼体材料。' }],
  魔宗: [{ id: 'demonic-burst', itemId: 'qi-burst-pill', name: '爆气丹', cost: 130, description: '燃起短暂爆发。' }, { id: 'demonic-crystal', itemId: 'blood-crystal', name: '血煞晶', cost: 100, description: '魔道炼材。' }, { id: 'demonic-realm', secretRealmId: 'blood-fiend', name: '血煞洞天名额', cost: 650, description: '开放八年。' }],
  鬼宗: [{ id: 'ghost-sand', itemId: 'yin-soul-sand', name: '阴魂砂', cost: 60, description: '温养魂道法器。' }, { id: 'ghost-lamp', itemId: 'soul-nourishing-lamp', name: '养魂灯', cost: 520, description: '稳定魂体。' }, { id: 'ghost-realm', secretRealmId: 'nether-tomb', name: '幽冥古墓名额', cost: 540, description: '开放十年。' }],
  丹宗: [{ id: 'alchemy-foundation', itemId: 'foundation-pill', name: '筑基丹', cost: 260, description: '辅助筑基。' }, { id: 'alchemy-herb', itemId: 'green-spirit-herb', name: '青灵草', cost: 30, description: '基础灵药。' }],
  器宗: [{ id: 'forge-iron', itemId: 'black-iron', name: '玄铁', cost: 40, description: '基础灵矿。' }, { id: 'forge-awl', itemId: 'restriction-awl', name: '破禁锥', cost: 460, description: '秘境探索法宝。' }],
}

export function sectOfferings(type?: SectType) { return [...COMMON, ...(type ? POOLS[type] ?? [] : [])] }
