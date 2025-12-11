"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { cn } from "@/lib/utils"

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === "/login"

    return (
        <div className="flex min-h-screen w-full bg-white text-slate-900">
            {/* Sidebar - hidden on login page */}
            {!isLoginPage && (
                <div className="hidden md:block fixed h-full z-10">
                    <AppSidebar />
                </div>
            )}

            {/* Main content - no margin on login page */}
            <main className={cn("flex-1 w-full", !isLoginPage && "md:pl-64")}>
                {children}
            </main>
        </div>
    )
}
