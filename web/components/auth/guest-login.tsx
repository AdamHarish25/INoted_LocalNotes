"use client"

import { useState } from "react"
import { Turnstile } from "@marsidev/react-turnstile"
import { Button } from "@/components/ui/button"
import { continueAsGuest } from "@/app/login/actions"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function GuestLogin() {
    const [status, setStatus] = useState<"initial" | "verifying" | "success" | "error">("initial")
    const [token, setToken] = useState<string | null>(null)
    const router = useRouter()

    // You should add this to your .env.local
    const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA" // Test Site Key

    const handleSuccess = async (token: string) => {
        setToken(token)
        setStatus("verifying")
        try {
            await continueAsGuest(token)
            setStatus("success")
            // Force a hard navigation to ensure cookies are recognized by the server
            // and to clear any client-side router cache that might think we are still unauthenticated.
            window.location.href = "/"
        } catch (error) {
            console.error("Guest login failed", error)
            setStatus("error")
        }
    }

    return (
        <div className="w-full">
            {status === "initial" && (
                <div className="flex flex-col gap-2">
                    <div className="flex justify-center">
                        <Turnstile
                            siteKey={SITE_KEY}
                            onSuccess={handleSuccess}
                            options={{
                                theme: 'auto',
                                size: 'flexible'
                            }}
                        />
                    </div>
                    <p className="text-center text-xs text-slate-400 dark:text-zinc-500">
                        Complete the captcha to continue as guest
                    </p>
                </div>
            )}

            {status === "verifying" && (
                <Button disabled className="w-full rounded-full h-11 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                </Button>
            )}

            {status === "success" && (
                <Button disabled className="w-full rounded-full h-11 bg-green-500 text-white">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Success! Redirecting...
                </Button>
            )}

            {status === "error" && (
                <div className="text-center">
                    <p className="text-red-500 text-xs mb-2">Verification failed. Please check your credentials or connection.</p>
                    <Button
                        variant="secondary"
                        onClick={() => setStatus("initial")}
                        className="w-full rounded-full h-11 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                    >
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    )
}
