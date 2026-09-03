import { MUTATED_ELEMENTS, STANDARD_ELEMENTS } from '../../data/spiritRoots'
import type { AcquiredSpiritRoot, SpiritElement, SpiritRoot, SpiritualAptitudeState } from '../../models'

export const ALL_SPIRIT_ELEMENTS: SpiritElement[] = [...STANDARD_ELEMENTS, ...MUTATED_ELEMENTS]
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function createSpiritualAptitude(innateRoot: SpiritRoot): SpiritualAptitudeState {
  const elementalGrowth = Object.fromEntries(ALL_SPIRIT_ELEMENTS.map((element) => [element, innateRoot.elements.includes(element) ? 10 : 0])) as Record<SpiritElement, number>
  const innatePurity = innateRoot.quality === 'HEAVENLY' ? 100 : innateRoot.quality === 'PURE' ? 90 : 72
  const elementalPurity = Object.fromEntries(ALL_SPIRIT_ELEMENTS.map((element) => [element, innateRoot.elements.includes(element) ? innatePurity : 0])) as Record<SpiritElement, number>
  return { innateRoot: { ...innateRoot, elements: [...innateRoot.elements], mutations: [...innateRoot.mutations] }, acquiredRoots: [], elementalGrowth, elementalPurity }
}

export function acquireSpiritRoot(state: SpiritualAptitudeState, element: SpiritElement, purity: number, stability: number, source: string, year: number, month: number): AcquiredSpiritRoot {
  const existing = state.acquiredRoots.find((root) => root.element === element)
  if (existing) {
    existing.purity = clamp(Math.max(existing.purity, purity), 1, 100)
    existing.stability = clamp(Math.max(existing.stability, stability), 0, 100)
    existing.source = `${existing.source}、${source}`
    state.elementalPurity[element] = Math.max(state.elementalPurity[element], existing.purity)
    return existing
  }
  const root = { id: `${element}-${year}-${month}-${state.acquiredRoots.length}`, element, purity: clamp(purity, 1, 100), stability: clamp(stability, 0, 100), source, acquiredYear: year, acquiredMonth: month }
  state.acquiredRoots.push(root)
  state.elementalPurity[element] = Math.max(state.elementalPurity[element], root.purity)
  state.elementalGrowth[element] = Math.max(state.elementalGrowth[element], 1)
  return root
}

export function purifySpiritRoot(state: SpiritualAptitudeState, element: SpiritElement, amount: number) {
  const root = state.acquiredRoots.find((entry) => entry.element === element)
  if (!root) return 0
  const before = root.purity
  root.purity = clamp(root.purity + Math.max(0, amount), 1, 100)
  state.elementalPurity[element] = Math.max(state.elementalPurity[element], root.purity)
  return root.purity - before
}

export function stabilizeSpiritRoot(state: SpiritualAptitudeState, element: SpiritElement, amount: number) {
  const root = state.acquiredRoots.find((entry) => entry.element === element)
  if (!root) return 0
  const before = root.stability
  root.stability = clamp(root.stability + Math.max(0, amount), 0, 100)
  return root.stability - before
}

export function growElement(state: SpiritualAptitudeState, element: SpiritElement, amount: number) {
  const before = state.elementalGrowth[element] ?? 0
  state.elementalGrowth[element] = clamp(before + amount, 0, 999)
  return state.elementalGrowth[element] - before
}

export function transformAcquiredRoot(state: SpiritualAptitudeState, rootId: string, nextElement: SpiritElement, source: string) {
  const root = state.acquiredRoots.find((entry) => entry.id === rootId)
  if (!root || state.innateRoot.elements.includes(nextElement) || state.acquiredRoots.some((entry) => entry.element === nextElement)) return false
  root.element = nextElement
  root.purity = clamp(root.purity - 8, 1, 100)
  root.stability = clamp(root.stability - 12, 0, 100)
  root.source = `${root.source} → ${source}`
  state.elementalGrowth[nextElement] = Math.max(1, state.elementalGrowth[nextElement])
  state.elementalPurity[nextElement] = Math.max(state.elementalPurity[nextElement], root.purity)
  return true
}

export function effectiveElementPower(state: SpiritualAptitudeState, element: SpiritElement) {
  const innate = state.innateRoot.elements.includes(element) ? state.innateRoot.cultivationMultiplier * state.innateRoot.specializationMultiplier : 0
  const acquired = state.acquiredRoots.find((root) => root.element === element)
  const acquiredPower = acquired ? (acquired.purity / 100) * (.45 + acquired.stability / 200) : 0
  return innate + acquiredPower + (state.elementalGrowth[element] ?? 0) / 200
}

export function calculateFiveElementBalance(state: SpiritualAptitudeState) {
  const values = STANDARD_ELEMENTS.map((element) => state.elementalGrowth[element] ?? 0)
  const maximum = Math.max(...values)
  if (maximum <= 0) return 0
  return Math.round(clamp(100 - (maximum - Math.min(...values)) / maximum * 100, 0, 100))
}

export function hasFiveElementFoundation(state: SpiritualAptitudeState) {
  return STANDARD_ELEMENTS.every((element) => state.innateRoot.elements.includes(element) || state.acquiredRoots.some((root) => root.element === element))
}

export function isFiveElementImbalanced(state: SpiritualAptitudeState) {
  return hasFiveElementFoundation(state) && calculateFiveElementBalance(state) < 60
}
