"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  FileText,
  PenTool,
  Star,
  Folder,
  LogOut,
  Settings,
  MoreVertical
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getWorkspaces } from "@/app/actions"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AppSidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchWorkspaces = () => {
      getWorkspaces().then(res => {
        if (res.success && res.data) setWorkspaces(res.data)
      })
    }

    fetchWorkspaces()

    const supabase = createClient()

    // Fetch user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const channel = supabase
      .channel('workspaces_sidebar')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        () => {
          fetchWorkspaces()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Layout handles visibility now

  return (
    <div className={cn("pb-12 w-64 border-r min-h-screen bg-gray-50/40 hidden md:block", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-6">
            {/* Logo could be an image or text */}
            <div className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center rounded-sm font-bold text-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="m2 7 10-5 10 5-10 5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Inoted
            </h2>
          </div>
        </div>

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500">
            General
          </h2>
          <div className="space-y-1">
            <Link href="/">
              <Button variant={pathname === "/" ? "secondary" : "ghost"} className="w-full justify-start text-slate-600">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/notes">
              <Button variant={pathname?.startsWith("/notes") ? "secondary" : "ghost"} className="w-full justify-start text-slate-600">
                <FileText className="mr-2 h-4 w-4" />
                My Notes
              </Button>
            </Link>
            <Link href="/whiteboard">
              <Button variant={pathname?.startsWith("/whiteboard") ? "secondary" : "ghost"} className="w-full justify-start text-slate-600">
                <PenTool className="mr-2 h-4 w-4" />
                My Whiteboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500">
            Tags
          </h2>
          <div className="space-y-1">
            <Link href="/favorites">
              <Button variant="ghost" className="w-full justify-start text-slate-600">
                <Star className="mr-2 h-4 w-4" />
                Favourites
              </Button>
            </Link>
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-xs font-semibold tracking-tight text-slate-500">
              Workspace
            </h2>
          </div>
          <div className="space-y-1">
            {workspaces.map((ws) => (
              <Link key={ws.id} href={`/workspace/${ws.id}`}>
                <Button variant={pathname?.startsWith(`/workspace/${ws.id}`) ? "secondary" : "ghost"} className="w-full justify-start text-slate-600">
                  <Folder className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="truncate">{ws.name}</span>
                </Button>
              </Link>
            ))}
            {workspaces.length === 0 && (
              <div className="px-4 py-2 text-xs text-slate-400 italic">No workspaces</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto absolute bottom-4 w-64 px-4">
        <div className="flex items-center gap-3 p-3 bg-blue-100/50 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">
          <Avatar className="h-9 w-9 border border-white shadow-sm">
            <AvatarImage src="/avatar-placeholder.png" alt={user?.user_metadata?.display_name || "User"} />
            <AvatarFallback>{(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || "U").toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 pl-1">
            <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
              {user?.user_metadata?.display_name || "User"}
            </span>
          </div>
          <Button
            // variant="ghost"
            size="icon"
            className="h-8 w-8 text-white bg-red-500 hover:text-red-700 hover:bg-red-200 rounded-full"
            onClick={async () => {
              const { signOut } = await import("@/app/actions")
              await signOut()
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
