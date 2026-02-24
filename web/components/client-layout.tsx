"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"
// import { CookieBanner } from "@/components/cookie-banner" // Waiting to see if I need to move it to a barrel file or distinct file. Done.
import { CookieBanner } from "@/components/cookie-banner"
import { MobileNav } from "@/components/mobile-nav"
import { ChatAssistant } from "@/components/chat-assistant"

import { useState, useEffect } from "react"

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === "/login"
    const isLandingPage = pathname === "/"
    const shouldHideSidebar = isLoginPage || isLandingPage

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    // Automatically expand sidebar when on dashboard
    useEffect(() => {
        if (pathname === "/dashboard") {
            setIsSidebarCollapsed(false)
        } else if (pathname === "/login" || pathname === "/") {
            setIsSidebarCollapsed(true)
        }
    }, [pathname])

    return (
        <div className="flex min-h-screen w-full bg-white text-slate-900">
            {/* Sidebar - hidden on login/landing page */}
            {!shouldHideSidebar && (
                <div className={cn("hidden md:block fixed h-full z-10 transition-all duration-300", isSidebarCollapsed ? "w-16" : "w-64")}>
                    <AppSidebar
                        className="w-full"
                        isCollapsed={isSidebarCollapsed}
                        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                </div>
            )}

            {/* Main content - no margin on login/landing page */}
            <main className={cn("flex-1 w-full transition-all duration-300", !shouldHideSidebar && (isSidebarCollapsed ? "md:pl-16" : "md:pl-64"))}>
                {children}
            </main>
            {!shouldHideSidebar && <MobileNav />}
            <CookieBanner />
            {!shouldHideSidebar && <ChatAssistant />}
        </div>
    )
}
