import type { Relationship, RelationshipType } from '../../models'

export function relationshipBetween(relationships: Relationship[], firstId: string, secondId: string) {
  return relationships.find((entry) => (entry.fromId === firstId && entry.toId === secondId) || (entry.fromId === secondId && entry.toId === firstId))
}

export function setRelationship(relationships: Relationship[], fromId: string, toId: string, type: RelationshipType, value: number, year: number, note = '') {
  const existing = relationshipBetween(relationships, fromId, toId)
  if (existing) { existing.type = type; existing.value = Math.max(-100, Math.min(100, value)); existing.note = note; return existing }
  const created: Relationship = { id: crypto.randomUUID(), fromId, toId, type, value: Math.max(-100, Math.min(100, value)), createdYear: year, note }
  relationships.push(created)
  return created
}

export function relationshipSummary(relationships: Relationship[], playerId: string) {
  const related = relationships.filter((entry) => entry.fromId === playerId || entry.toId === playerId)
  return { friends: related.filter((entry) => entry.type === '好友' || entry.type === '恩情').length, rivals: related.filter((entry) => entry.type === '竞争').length, enemies: related.filter((entry) => entry.type === '敌对' || entry.type === '仇恨').length, disciples: related.filter((entry) => entry.type === '师徒' && entry.fromId === playerId).length }
}

