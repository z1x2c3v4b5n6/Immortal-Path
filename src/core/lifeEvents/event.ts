import { LIFE_EVENTS } from '../../data/lifeEvents'

export const lifeEventById = (id: string) => LIFE_EVENTS.find((event) => event.id === id)
export { LIFE_EVENTS }
