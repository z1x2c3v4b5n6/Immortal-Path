export interface Weighted<T> { value: T; weight: number }

export class RandomService {
  constructor(private source: () => number = Math.random) {}
  random() { return this.source() }
  randomInt(min: number, max: number) { return Math.floor(this.random() * (max - min + 1)) + min }
  chance(probability: number) { return this.random() < Math.max(0, Math.min(1, probability)) }
  pick<T>(values: readonly T[]): T { return values[this.randomInt(0, values.length - 1)] }
  weightedRandom<T>(entries: readonly Weighted<T>[]): T {
    const valid = entries.filter((entry) => entry.weight > 0)
    if (!valid.length) throw new Error('weightedRandom requires a positive weight')
    const total = valid.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = this.random() * total
    for (const entry of valid) {
      roll -= entry.weight
      if (roll < 0) return entry.value
    }
    return valid[valid.length - 1].value
  }
}

export const random = new RandomService()

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededSource(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export const createSeededRandom = (seed: string) => new RandomService(seededSource(seed.trim().toUpperCase()))

export function generateWorldSeed(rng: RandomService = random): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return `${rng.pick(letters.split(''))}${rng.pick(letters.split(''))}-${rng.randomInt(10000000, 99999999)}`
}
