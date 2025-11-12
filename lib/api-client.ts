/**
 * API client utility
 * Automatically adds Bearer token to request headers
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Get stored token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/**
 * Set token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('token', token)
}

/**
 * Clear token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

/**
 * Send API request
 * Automatically adds Bearer token (unless skipAuth is true)
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...restOptions } = options

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  // Add Bearer token (if not skipping auth)
  if (!skipAuth) {
    const token = getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  })

  // If 401, clear token and redirect to login page
  if (response.status === 401) {
    clearToken()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * GET request
 */
export function apiGet<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' })
}

/**
 * POST request
 */
export function apiPost<T = any>(
  endpoint: string,
  data?: any,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request
 */
export function apiPut<T = any>(
  endpoint: string,
  data?: any,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request
 */
export function apiDelete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
}

