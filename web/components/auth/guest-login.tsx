"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GuestLogin() {
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async () => {
        setIsLoading(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInAnonymously()

            if (error) throw error

            // Force a hard navigation to ensure cookies are recognized by the server
            // and to clear any client-side router cache that might think we are still unauthenticated.
            window.location.href = "/"
        } catch (error) {
            console.error("Guest login failed", error)
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full">
            <Button
                onClick={handleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full rounded-full h-11 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 bg-white dark:bg-black"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Guest Session...
                    </>
                ) : (
                    "Continue as Guest"
                )}
            </Button>
        </div>
    )
}
