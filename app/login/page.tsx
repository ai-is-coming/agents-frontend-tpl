'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { setToken } from '@/lib/api-client'
import { login } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call backend login API
      const data = await login(email)

      // Store token to localStorage
      setToken(data.token)

      // Redirect to home page
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your email to login
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Quick login with:</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setEmail('admin@ai.com')}
              className="rounded-md bg-secondary px-3 py-1 text-xs hover:bg-secondary/80"
            >
              admin@ai.com
            </button>
            <button
              type="button"
              onClick={() => setEmail('user@ai.com')}
              className="rounded-md bg-secondary px-3 py-1 text-xs hover:bg-secondary/80"
            >
              user@ai.com
            </button>
            <button
              type="button"
              onClick={() => setEmail('guest@ai.com')}
              className="rounded-md bg-secondary px-3 py-1 text-xs hover:bg-secondary/80"
            >
              guest@ai.com
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

