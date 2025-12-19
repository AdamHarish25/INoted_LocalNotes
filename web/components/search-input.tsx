"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export function SearchInput() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [text, setText] = useState(searchParams.get("q") || "")

    useEffect(() => {
        // Debounce search update
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString())
            if (text) {
                params.set("q", text)
            } else {
                params.delete("q")
            }
            router.replace(`${pathname}?${params.toString()}`)
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [text, router, searchParams, pathname])

    return (
        <div className="relative w-full max-w-xl">
            <Input
                placeholder={pathname === "/whiteboard" ? "Search Whiteboards..." : (pathname === "/notes" ? "Search Notes..." : "Search Notes & Whiteboards...")}
                className="pl-4 pr-10 py-6 rounded-2xl border-slate-200 shadow-sm bg-white text-slate-800 dark:bg-black dark:text-white"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        </div>
    )
}
