/**
 * Session API
 */

import { apiGet, apiPost } from '../api-client'

export interface SessionItem {
  id: number
  title: string
  status: number
  created_at: string
  updated_at: string
}

export interface CreateSessionResponse { sessionId: number }

export interface MessageItem {
  id: number
  role: 'user' | 'assistant' | 'system' | 'tool'
  trace_id: string
  content: any
  created_at: string
  updated_at: string
}

export async function createSession(title?: string): Promise<CreateSessionResponse> {
  return apiPost<CreateSessionResponse>('/session/create', title ? { title } : {})
}

export async function listSessions(params?: { limit?: number; before?: string }): Promise<{ sessions: SessionItem[] }> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.before) query.set('before', params.before)
  const qs = query.toString()
  return apiGet<{ sessions: SessionItem[] }>(`/session/list${qs ? `?${qs}` : ''}`)
}

export async function listMessages(
  sessionId: number,
  params?: { limit?: number; afterId?: number }
): Promise<{ messages: MessageItem[] }> {
  const query = new URLSearchParams()
  if (params?.limit) query.set('limit', String(params.limit))
  if (typeof params?.afterId !== 'undefined') query.set('afterId', String(params.afterId))
  const qs = query.toString()
  return apiGet<{ messages: MessageItem[] }>(`/session/${sessionId}/msg/list${qs ? `?${qs}` : ''}`)
}

