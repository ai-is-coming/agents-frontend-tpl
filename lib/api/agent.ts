/**
 * Agent API
 */

export interface AgentChatRequest {
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
 */
export async function chatStream(
  request: AgentChatRequest,
  token: string
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  const response = await fetch(`/api/agent/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: request.prompt,
      stream: request.stream ?? true,
      webSearch: request.webSearch ?? false,
      ...(request.provider ? { provider: request.provider } : {}),
      ...(request.model ? { model: request.model } : {}),
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response
}

/**
 * Chat with AI agent (non-streaming)
 */
export async function chat(
  request: Omit<AgentChatRequest, 'stream'>,
  token: string
): Promise<AgentChatResponse> {
  const response = await chatStream(
    { ...request, stream: false },
    token
  )

  return response.json()
}

