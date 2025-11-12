/**
 * Authentication API
 */

import { apiPost } from '../api-client'

export interface LoginRequest {
  email: string
}

export interface LoginResponse {
  token: string
}

/**
 * User login
 */
export async function login(email: string): Promise<LoginResponse> {
  // Call backend via unified /api prefix (Next.js rewrite proxies to backend)
  return apiPost<LoginResponse>(
    '/auth/login',
    { email },
    { skipAuth: true } // Login endpoint doesn't require authentication
  )
}

