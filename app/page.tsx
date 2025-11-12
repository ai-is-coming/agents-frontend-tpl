'use client'

import { useRouter } from 'next/navigation'
import ClientChat from "@/components/chatbot/client-chat";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/api-client";
import { LogOut } from "lucide-react";

export default function Home() {
  const router = useRouter()

  const handleLogout = () => {
    clearToken()
    router.push('/login')
  }

  return (
    <AuthGuard>
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-3xl mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="w-full max-w-3xl">
          <ClientChat />
        </div>
      </main>
    </AuthGuard>
  );
}
