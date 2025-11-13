'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import ClientChat from "@/components/chatbot/client-chat";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { clearToken, getToken } from "@/lib/api-client";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>('')
  // Unwrap params Promise using React.use()
  const unwrappedParams = use(params)
  const sessionId = parseInt(unwrappedParams.sessionId, 10)

  useEffect(() => {
    // Token is the email in this system
    const token = getToken()
    if (token) {
      setUserEmail(token)
    }
  }, [])

  const handleLogout = () => {
    clearToken()
    router.push('/login')
  }

  return (
    <AuthGuard>
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-6xl mb-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {userEmail}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="w-full max-w-6xl">
          <ClientChat initialSessionId={sessionId} />
        </div>
      </main>
    </AuthGuard>
  );
}

