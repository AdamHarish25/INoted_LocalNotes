"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
    LayoutGrid,
    FileText,
    PenTool,
    Settings,
    Folder,
    LogOut,
    Check,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWorkspaces, signOut } from "@/app/actions"
import { cn } from "@/lib/utils"

export function MobileNav() {
    const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
    const [workspaces, setWorkspaces] = useState<any[]>([])

    // Fetch workspaces for mobile nav
    useEffect(() => {
        getWorkspaces().then(res => {
            if (res.success && res.data) setWorkspaces(res.data)
        })
    }, [])

    const pathname = usePathname()
    // Hide on editor pages (subpaths of /notes and /whiteboard, but not the dashboard pages themselves)
    // /notes/xyz -> hide. /notes -> show.
    // /whiteboard/xyz -> hide. /whiteboard -> show.
    const isEditorPage = pathname && (
        (pathname.startsWith('/notes/') && pathname !== '/notes') ||
        (pathname.startsWith('/whiteboard/') && pathname !== '/whiteboard')
    )

    if (isEditorPage) return null

    return (
        <>
            {/* Mobile Bottom Bar (Tools & Nav) */}
            <div className="absolute bottom-6 left-6 z-30 md:hidden flex items-center justify-center pointer-events-none">
                {/* Navigation Button */}
                <button
                    onClick={() => setIsNavMenuOpen(true)}
                    className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 active:scale-95 transition-transform"
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Navigation Menu Overlay */}
            {isNavMenuOpen && (
                <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col md:hidden animate-in fade-in duration-200">
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto">
                        {/* Logo/Brand */}
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Inoted
                            </h2>
                        </div>

                        {/* Main Links */}
                        <div className="w-full max-w-xs space-y-2">
                            <Link href="/" className="w-full">
                                <Button variant="ghost" className="w-full justify-start text-lg h-12 text-slate-600 bg-blue-50/50">
                                    <LayoutGrid className="w-5 h-5 mr-3 text-blue-600" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/notes" className="w-full">
                                <Button variant="ghost" className="w-full justify-start text-lg h-12 text-slate-600">
                                    <FileText className="w-5 h-5 mr-3 text-slate-400" />
                                    My Notes
                                </Button>
                            </Link>
                            <Link href="/whiteboard" className="w-full">
                                <Button variant="ghost" className="w-full justify-start text-lg h-12 text-slate-600">
                                    <PenTool className="w-5 h-5 mr-3 text-slate-400" />
                                    My Whiteboard
                                </Button>
                            </Link>
                            <Link href="/settings" className="w-full">
                                <Button variant="ghost" className="w-full justify-start text-lg h-12 text-slate-600">
                                    <Settings className="w-5 h-5 mr-3 text-slate-400" />
                                    Settings
                                </Button>
                            </Link>
                        </div>

                        {/* Separator */}
                        <div className="w-16 h-1 bg-slate-100 rounded-full" />

                        {/* Workspaces */}
                        <div className="w-full max-w-xs space-y-3">
                            <h3 className="text-sm font-medium text-slate-400 text-center uppercase tracking-wider">Workspace</h3>
                            <div className="space-y-1">
                                {workspaces.map((ws) => (
                                    <Link key={ws.id} href={`/workspace/${ws.id}`} className="w-full block">
                                        <Button variant="ghost" className="w-full justify-start text-slate-600">
                                            <Folder className="mr-3 h-4 w-4 text-yellow-500 fill-yellow-500" />
                                            <span className="truncate">{ws.name}</span>
                                        </Button>
                                    </Link>
                                ))}
                                {workspaces.length === 0 && (
                                    <div className="text-center text-sm text-slate-400 italic py-2">No workspaces</div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1" />

                        {/* Logout */}
                        <Button
                            variant="destructive"
                            className="rounded-full w-12 h-12 p-0 shadow-lg shadow-red-200"
                            onClick={async () => await signOut()}
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                        <span className="text-xs font-medium text-red-500">Logout</span>
                    </div>

                    {/* Close Button */}
                    <div className="p-6 flex justify-center pb-8">
                        <button
                            onClick={() => setIsNavMenuOpen(false)}
                            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
