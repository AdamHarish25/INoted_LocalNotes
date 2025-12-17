"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { updateWorkspace, deleteWorkspace } from "@/app/actions"

interface WorkspaceOptionsProps {
    workspaceId: string
    workspaceName: string
}

export function WorkspaceOptions({ workspaceId, workspaceName }: WorkspaceOptionsProps) {
    const router = useRouter()
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [name, setName] = useState(workspaceName)
    const [isLoading, setIsLoading] = useState(false)

    const handleRename = async () => {
        if (!name.trim()) return
        setIsLoading(true)
        const res = await updateWorkspace(workspaceId, name)
        setIsLoading(false)
        if (res.success) {
            setIsRenameOpen(false)
            router.refresh()
        }
    }

    const handleDelete = async () => {
        setIsLoading(true)
        const res = await deleteWorkspace(workspaceId)
        setIsLoading(false)
        if (res.success) {
            setIsDeleteOpen(false)
            router.push("/") // Go back to dashboard
            router.refresh()
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Rename Dialog */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Workspace</DialogTitle>
                        <DialogDescription>
                            Enter a new name for your workspace.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename()
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{workspaceName}</strong>? This action cannot be undone and will delete all notes and whiteboards inside.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
