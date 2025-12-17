"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Plus, Check } from "lucide-react"
import { createWorkspace, getWorkspaces, assignNoteToWorkspace } from "@/app/actions"

export function WorkspaceSelector({ noteId, initialWorkspaceName }: { noteId: string, initialWorkspaceName?: string }) {
    const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName || "Unorganized")
    const [workspaces, setWorkspaces] = useState<any[]>([])
    const [newSpaceName, setNewSpaceName] = useState("")
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (isOpen) {
            getWorkspaces().then(res => {
                if (res.success && res.data) setWorkspaces(res.data)
            })
        }
    }, [isOpen])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!newSpaceName.trim()) return
        const res = await createWorkspace(newSpaceName)
        if (res.success && res.data) {
            setWorkspaces([res.data, ...workspaces])
            setNewSpaceName("")
            // Auto assign
            handleSelect(res.data)
        }
    }

    const handleSelect = async (ws: any) => {
        const res = await assignNoteToWorkspace(noteId, ws.id)
        if (res.success) {
            setWorkspaceName(ws.name)
            setIsOpen(false)
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1 md:gap-2 cursor-pointer group">
                    <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors hidden md:inline">Organize to:</span>
                    <span className="bg-yellow-400 text-white text-[10px] px-2 md:px-3 py-1 rounded-full font-bold hover:bg-yellow-500 transition-colors truncate max-w-[100px] md:max-w-[150px]">
                        {workspaceName}
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>Select Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-48 overflow-y-auto">
                    {workspaces.map(ws => (
                        <DropdownMenuItem key={ws.id} onClick={() => handleSelect(ws)} className="justify-between">
                            <span className="truncate">{ws.name}</span>
                            {workspaceName === ws.name && <Check className="h-3 w-3 opacity-50" />}
                        </DropdownMenuItem>
                    ))}
                    {workspaces.length === 0 && <div className="text-xs text-slate-400 p-2 text-center">No workspaces yet</div>}
                </div>
                <DropdownMenuSeparator />
                <div className="p-2">
                    <form onSubmit={handleCreate} className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Stop propagation on click to allow typing without closing */}
                        <Input
                            placeholder="Create new workspace..."
                            className="h-8 text-xs"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <Button type="submit" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
