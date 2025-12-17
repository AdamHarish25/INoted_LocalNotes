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
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Loader2
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { getWorkspaces, createWorkspace } from "@/app/actions"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function AppSidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    setIsCreatingWorkspace(true)
    const res = await createWorkspace(newWorkspaceName)
    setIsCreatingWorkspace(false)

    if (res.success) {
      setNewWorkspaceName("")
      setIsCreateWorkspaceOpen(false)
      // Refresh workspaces handled by realtime subscription or we can optimize by manually adding if strict consistency not needed immediately
    } else {
      // Handle error (maybe toast)
      console.error(res.error)
    }
  }

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
    <div className={cn("pb-12 w-64 border-r border-sidebar-border min-h-screen bg-sidebar hidden md:block shadow-md dark:shadow-white", className)}>
      <div className="space-y-4 py-4">
        <div className={cn("py-2 flex items-center", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 mb-0">
              {/* Logo could be an image or text */}
              {/* <div className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center rounded-sm font-bold text-xs">
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
              <h2 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Inoted
              </h2> */}

              <img src="/logo.png" alt="Logo" className="h-5" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("text-slate-400 hover:text-slate-600", isCollapsed && "mb-4")}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        <div className="px-3 py-2">
          {!isCollapsed && (
            <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-slate-500">
              General
            </h2>
          )}
          <div className="space-y-1">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "secondary" : "ghost"}
                className={cn("w-full text-sidebar-foreground/70 hover:text-sidebar-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}
                title={isCollapsed ? "Dashboard" : undefined}
              >
                <LayoutGrid className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "Dashboard"}
              </Button>
            </Link>
            <Link href="/notes">
              <Button
                variant={pathname?.startsWith("/notes") ? "secondary" : "ghost"}
                className={cn("w-full text-sidebar-foreground/70 hover:text-sidebar-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}
                title={isCollapsed ? "My Notes" : undefined}
              >
                <FileText className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "My Notes"}
              </Button>
            </Link>
            <Link href="/whiteboard">
              <Button
                variant={pathname?.startsWith("/whiteboard") ? "secondary" : "ghost"}
                className={cn("w-full text-sidebar-foreground/70 hover:text-sidebar-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}
                title={isCollapsed ? "My Whiteboard" : undefined}
              >
                <PenTool className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "My Whiteboard"}
              </Button>
            </Link>
            <Link href="/settings">
              <Button
                variant={pathname?.startsWith("/settings") ? "secondary" : "ghost"}
                className={cn("w-full text-sidebar-foreground/70 hover:text-sidebar-foreground", isCollapsed ? "justify-center px-0" : "justify-start")}
                title={isCollapsed ? "Settings" : undefined}
              >
                <Settings className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "Settings"}
              </Button>
            </Link>
          </div>
        </div>

        {/* <div className="px-3 py-2">
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
        </div> */}

        <div className={`${isCollapsed ? "px-1" : "px-3"} py-2`}>
          <div className={cn("flex items-center px-4 mb-2", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <h2 className="text-xs font-semibold tracking-tight text-slate-500">
                Workspace
              </h2>
            )}

            {!isCollapsed ? (
              <Dialog open={isCreateWorkspaceOpen} onOpenChange={setIsCreateWorkspaceOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 text-slate-500 hover:text-slate-900">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                    <DialogDescription>
                      Create a new workspace to organize your notes and whiteboards.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="Workspace Name"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateWorkspace()
                      }}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateWorkspaceOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateWorkspace} disabled={isCreatingWorkspace}>
                      {isCreatingWorkspace && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Folder className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <div className="space-y-1">
            {!isCollapsed ? (
              <>
                {workspaces.map((ws) => (
                  <Link key={ws.id} href={`/workspace/${ws.id}`}>
                    <Button variant={pathname?.startsWith(`/workspace/${ws.id}`) ? "secondary" : "ghost"} className="w-full justify-start text-slate-600">
                      <Folder className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="truncate dark:text-white">{ws.name}</span>
                    </Button>
                  </Link>
                ))}
                {workspaces.length === 0 && (
                  <div className="px-4 py-2 text-xs text-slate-400 italic">No workspaces</div>
                )}
              </>
            ) : (
              // Collapsed workspace view - maybe just a summary or nothing? 
              // Let's hide detailed workspaces in collapsed mode for now as they are dynamic
              // Or user can click the folder icon above to expand?
              // Actually, let's just show little dots or generic icons if busy
              null
            )}
          </div>
        </div>
      </div>

      <div className={cn("mt-auto absolute bottom-4", isCollapsed ? "w-full flex justify-center px-0" : "w-64 px-4")}>
        <div className={cn("flex items-center dark:bg-black gap-3 p-3 bg-blue-100/50 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer", isCollapsed && "p-2 justify-center aspect-square rounded-full")}>
          <Avatar className="h-9 w-9 border border-white shadow-sm dark:shadow-white">
            <AvatarImage src="/avatar-placeholder.png" alt={user?.user_metadata?.display_name || "User"} />
            <AvatarFallback>{(user?.user_metadata?.display_name?.[0] || user?.email?.[0] || "U").toUpperCase()}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="flex flex-col flex-1 pl-1">
                <span className="text-sm font-medium text-slate-900  dark:text-white truncate max-w-[120px]">
                  {user?.user_metadata?.display_name || "User"}
                </span>
              </div>
              <Button
                // variant="ghost"
                size="icon"
                className="h-8 w-8 text-white bg-red-500 hover:text-red-700 hover:bg-red-200 rounded-full"
                onClick={async (e) => {
                  e.stopPropagation() // Prevent parent click
                  const { signOut } = await import("@/app/actions")
                  await signOut()
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
