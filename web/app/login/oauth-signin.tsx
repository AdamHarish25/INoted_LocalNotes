"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useSearchParams } from "next/navigation"

export function OAuthSignIn() {
    const searchParams = useSearchParams()
    const next = searchParams.get("next")

    const handleLogin = async (provider: 'google' | 'github') => {
        const supabase = createClient()
        const redirectTo = `${location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`

        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
            },
        })
    }

    return (
        <div className="flex justify-center gap-6">
            {/* <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-100 shadow-sm">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" className="w-5 h-5" alt="Microsoft" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-slate-100 shadow-sm">
                <img src="https://authjs.dev/img/providers/apple.svg" className="w-5 h-5" alt="Apple" />
            </Button> */}
            <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 border-slate-100 shadow-sm"
                onClick={() => handleLogin('google')}
            >
                <img src="https://authjs.dev/img/providers/google.svg" className="w-5 h-5" alt="Google" />
            </Button>
        </div>
    )
}
