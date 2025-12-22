"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"
// import { CookieBanner } from "@/components/cookie-banner" // Waiting to see if I need to move it to a barrel file or distinct file. Done.
import { CookieBanner } from "@/components/cookie-banner"
import { MobileNav } from "@/components/mobile-nav"

import { useState, useEffect } from "react"

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === "/login"
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

    // Automatically expand sidebar when on dashboard
    useEffect(() => {
        if (pathname === "/") {
            setIsSidebarCollapsed(false)
        }
    }, [pathname])

    return (
        <div className="flex min-h-screen w-full bg-white text-slate-900">
            {/* Sidebar - hidden on login page */}
            {!isLoginPage && (
                <div className={cn("hidden md:block fixed h-full z-10 transition-all duration-300", isSidebarCollapsed ? "w-16" : "w-64")}>
                    <AppSidebar
                        className="w-full"
                        isCollapsed={isSidebarCollapsed}
                        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                </div>
            )}

            {/* Main content - no margin on login page */}
            <main className={cn("flex-1 w-full transition-all duration-300", !isLoginPage && (isSidebarCollapsed ? "md:pl-16" : "md:pl-64"))}>
                {children}
            </main>
            {!isLoginPage && <MobileNav />}
            <CookieBanner />
        </div>
    )
}
