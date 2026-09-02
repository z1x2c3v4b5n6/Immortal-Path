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
