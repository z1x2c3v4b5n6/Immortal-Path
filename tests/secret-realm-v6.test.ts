import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '../src/core/random/RandomService'
import { completeSecretRealmEncounter, continueSecretRealm, createSecretRealmRun, nextSecretRealmEncounter, secretRealmRoutes } from '../src/core/secretRealm/secretRealm'
import { playerFixture } from './fixtures'

describe('V6 secret realms', () => {
  it('creates seeded route choices and records the selected branch', () => {
    const rng = createSeededRandom('realm-routes')
    const run = createSecretRealmRun('azure-cloud')
    const encounter = nextSecretRealmEncounter(run)!
    completeSecretRealmEncounter(run, encounter, encounter.rewards, rng)
    expect(run.routeChoices?.length).toBeGreaterThanOrEqual(2)
    const selectedRoute = run.routeChoices![0].name
    expect(continueSecretRealm(run, run.routeChoices![0].id, rng, playerFixture())).toBe(true)
    expect(run.eventHistory.join()).toContain(selectedRoute)
    expect(secretRealmRoutes('azure-cloud', createSeededRandom('realm-routes'))).toEqual(secretRealmRoutes('azure-cloud', createSeededRandom('realm-routes')))
  })
  it('only clears after the final boss is defeated', () => {
    const run = createSecretRealmRun('azure-cloud')
    run.currentDepth = 3
    const boss = nextSecretRealmEncounter(run)!
    expect(boss.isBoss).toBe(true)
    completeSecretRealmEncounter(run, boss)
    expect(run.status).toBe('CLEARED')
    expect(run.bossDefeated).toBe(true)
  })
})
