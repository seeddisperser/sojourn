import { v4 as uuidv4 } from 'uuid'
import { getDb } from './db/schema.js'
import { broadcast } from './ws.js'

export type EventType =
  | 'note_added'
  | 'note_updated'
  | 'image_added'
  | 'comment_posted'
  | 'spec_created'
  | 'spec_revised'
  | 'build_started'
  | 'build_finished'
  | 'build_failed'
  | 'hinge_point_surfaced'
  | 'cost_threshold_crossed'
  | 'preview_available'
  | 'collaborator_comment'
  | 'agent_message'
  | 'user_online'
  | 'user_offline'

export interface SojournEvent {
  id: string
  type: EventType
  actor: string
  related_artifact_id?: string
  related_artifact_type?: string
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export function createEvent(
  type: EventType,
  message: string,
  actor = 'system',
  opts: {
    related_artifact_id?: string
    related_artifact_type?: string
    metadata?: Record<string, unknown>
  } = {}
): SojournEvent {
  const event: SojournEvent = {
    id: uuidv4(),
    type,
    actor,
    message,
    timestamp: new Date().toISOString(),
    ...opts,
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO events (id, type, actor, related_artifact_id, related_artifact_type, message, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.type,
    event.actor,
    event.related_artifact_id ?? null,
    event.related_artifact_type ?? null,
    event.message,
    event.timestamp,
    event.metadata ? JSON.stringify(event.metadata) : null
  )

  broadcast({ type: 'event', payload: event })
  return event
}
