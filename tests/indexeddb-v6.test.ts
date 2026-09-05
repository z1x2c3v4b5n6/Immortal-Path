import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { SaveService } from '../src/core/save/SaveService'
import { acquireSpiritRoot } from '../src/core/aptitude/aptitude'
import { saveFixture } from './fixtures'
import { CharacterState, CultivationAction } from '../src/models'

describe('V3.5 IndexedDB persistence', () => {
  afterEach(async () => SaveService.remove())

  it('restores a current save with aptitude, techniques and acquired talents after a fresh read', async () => {
    const save = saveFixture()
    acquireSpiritRoot(save.player!.spiritualAptitude, '雷', 81, 67, '雷劫淬体', 155, 8)
    save.player!.knownTechniques.push('thunder-sword')
    save.player!.activeTechnique = 'thunder-sword'
    save.player!.techniqueProgress.push({ techniqueId: 'thunder-sword', experience: 18, level: 3 })
    save.player!.acquiredTalents.push({ talentId: 'nine-lives', name: '九死一生', acquiredYear: 155, acquiredMonth: 8, source: '九次濒死' })
    save.player!.fateTags.push({ id: 'SAVED_ELDER', name: '救命之恩', description: '旧日因果', createdAt: 155 })
    save.player!.lifeEventHistory.push({ eventId: 'mountain-elder', eventName: '山中老人', year: 155, month: 8, age: 55, choice: 'save', choiceLabel: '救助老人', result: '老人获救', importance: 3, tags: ['elder'] })
    save.player!.lifeTimeline.push({ id: '155-8-event', year: 155, month: 8, age: 55, text: '救下一位老人。', type: 'event', importance: 3 })
    save.player!.importantEvents.push(save.player!.lifeTimeline[0])
    save.player!.resources.spiritHerbs = 6
    save.player!.characterStates = [CharacterState.BOTTLENECK]
    save.player!.cultivationLogs.push({ id: 'cultivation', year: 155, month: 8, action: CultivationAction.MEDITATION, years: 3, title: '闭关', summary: '潜修三年。', cultivationGain: 100, techniqueExperience: 18, resultType: 'ordinary', importance: 1 })
    save.player!.majorOpportunities.push({ eventId: 'cave', name: '古修洞府', year: 155, rewardLevel: 4, result: '绝境得宝' })
    save.player!.inheritanceHistory.push({ eventId: 'cave', name: '风雷遁甲经', year: 155, source: '古修传承' })
    await SaveService.save(save)
    const restored = await SaveService.load()
    expect(restored?.version).toBe(11)
    expect(restored?.player?.spiritualAptitude.acquiredRoots[0]).toMatchObject({ element: '雷', purity: 81, stability: 67 })
    expect(restored?.player?.activeTechnique).toBe('thunder-sword')
    expect(restored?.player?.techniqueProgress[0]).toMatchObject({ techniqueId: 'thunder-sword', level: 3 })
    expect(restored?.player?.acquiredTalents[0].talentId).toBe('nine-lives')
    expect(restored?.player?.fateTags[0].id).toBe('SAVED_ELDER')
    expect(restored?.player?.lifeEventHistory[0].choice).toBe('save')
    expect(restored?.player?.importantEvents[0].text).toContain('老人')
    expect(restored?.player?.resources.spiritHerbs).toBe(6)
    expect(restored?.player?.characterStates).toEqual([CharacterState.BOTTLENECK])
    expect(restored?.player?.cultivationLogs[0].id).toBe('cultivation')
    expect(restored?.player?.majorOpportunities[0].name).toBe('古修洞府')
    expect(restored?.player?.inheritanceHistory[0].name).toBe('风雷遁甲经')
  })
})
