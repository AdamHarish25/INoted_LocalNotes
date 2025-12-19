"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"

export function GuestBanner() {
    const handleLogin = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?next=${next}`
    }

    return (
        <div className="bg-blue-600 dark:bg-blue-900 text-white px-6 py-4 rounded-lg shadow-md flex items-center justify-between mb-8">
            <div>
                <h3 className="font-bold text-lg">Browsing as Guest</h3>
                <p className="text-sm opacity-90">You are in read-only mode. Create an account to save your work.</p>
            </div>
            <Button onClick={handleLogin} variant="secondary" className="whitespace-nowrap">
                Log In / Sign Up
            </Button>
        </div>
    )
}
