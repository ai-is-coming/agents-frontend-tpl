/**
 * Agent API
 */

import { apiStream } from '../api-client'

export interface AgentChatRequest {
  sessionId: number
  prompt: string
  stream?: boolean
  webSearch?: boolean
  provider?: string
  model?: string
}

export interface AgentChatResponse {
  text: string
}

/**
 * Chat with AI agent (streaming)
 * Returns a Response object with streaming body
 * Note: For streaming responses, we need to return the raw Response object
 */
export async function chatStream(
  request: AgentChatRequest,
  options?: { signal?: AbortSignal }
): Promise<Response> {
  const requestBody = {
    sessionId: request.sessionId,
    prompt: request.prompt,
    stream: request.stream ?? true,
    webSearch: request.webSearch ?? false,
    ...(request.provider ? { provider: request.provider } : {}),
    ...(request.model ? { model: request.model } : {}),
  }

  return apiStream('/agent/chat', {
    method: 'POST',
    body: JSON.stringify(requestBody),
    signal: options?.signal,
  })
}

/**
 * Chat with AI agent (non-streaming)
 */
export async function chat(
  request: Omit<AgentChatRequest, 'stream'>
): Promise<AgentChatResponse> {
  const response = await chatStream(
    { ...request, stream: false }
  )

  return response.json()
}

