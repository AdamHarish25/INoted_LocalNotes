"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Cookie } from "lucide-react"
import { cn } from "@/lib/utils"

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has already acknowledged
        const hasAcknowledged = localStorage.getItem("cookie-consent")
        if (!hasAcknowledged) {
            setIsVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem("cookie-consent", "true")
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 m-4 md:m-6",
            "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl",
            "flex flex-col sm:flex-row items-center justify-between gap-4",
            "animate-in slide-in-from-bottom duration-500 ease-in-out"
        )}>
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Cookie className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-center sm:text-left">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        We use cookies
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xl">
                        This site uses cookies to ensure you get the best experience and to manage authentication sessions, especially on mobile browsers with strict cookie policies.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
                <Button
                    onClick={handleAccept}
                    className="flex-1 sm:flex-none rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-none"
                    size="sm"
                >
                    Allow Site Access
                </Button>
            </div>
        </div>
    )
}
