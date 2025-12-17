"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Trash2, Loader2, MoreHorizontal } from "lucide-react"
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
import { updateNote, updateWhiteboard, deleteNote, deleteWhiteboard } from "@/app/actions"

interface ResourceOptionsProps {
    id: string
    title: string
    type: "note" | "whiteboard"
}

export function ResourceOptions({ id, title, type }: ResourceOptionsProps) {
    const router = useRouter()
    const [isRenameOpen, setIsRenameOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [name, setName] = useState(title)
    const [isLoading, setIsLoading] = useState(false)

    const handleRename = async () => {
        if (!name.trim()) return
        setIsLoading(true)

        // Ensure consistent data structure for update actions
        const data = { title: name }
        let res

        if (type === "note") {
            // updateNote signature: (id: string, data: { content?: any, title?: string })
            res = await updateNote(id, data)
        } else {
            // For whiteboard, we only have updateWhiteboard(id, content) but we probably need to handle title updates separately or within same action?
            // Checking actions.ts updateWhiteboard only takes content.
            // Wait, I missed checking updateWhiteboard signature carefully.
            // Let's assume for now I need to fix updateWhiteboard to accept title or use a specific function if not available.
            // But usually it's cleaner to have direct update. 
            // Actually, let's look at the DB schema or actions again.
            // Looking at previous actions file: updateWhiteboard takes (id, content). It doesn't seem to take title.
            // But createWhiteboard takes title.
            // I should probably update `updateWhiteboard` to take title as well or make a new action.
            // For now, I'll assume I can modify the updateWhiteboard action or create a simple updateResourceTitle action if needed.
            // Let's use a dynamic import or assume I'll fix the action in next step.
            // To be safe, I will implement a specific server action for renaming if the existing one is insufficient, 
            // but let's try to fetch what we have.

            // Actually, let's fix the server action in parallel or just assume it works for now?
            // No, I must be precise. `updateWhiteboard` in actions.ts:
            // export async function updateWhiteboard(id: string, content: any) { ... .update({ content, ... }) }
            // It ONLY updates content! I need to change it to accept title.

            // I'll leave a comment here and fix actions.ts in the next step to support title updates for whiteboards.
            // For now, I'll write the code assuming it accepts an object or I'll create a new utility.
            // Let's assume I'll modify updateWhiteboard to be: (id: string, data: { content?: any, title?: string })
            // effectively matching updateNote signature style or close to it.
            // Or I will create a separate `renameResource` action? No, better to stick to standard updates.

            // Let's assume I'll refactor updateWhiteboard to: updateWhiteboard(id, { title: name })
            res = await updateWhiteboard(id, { title: name })
        }

        setIsLoading(false)
        if (res && res.success) {
            setIsRenameOpen(false)
            router.refresh()
        }
    }

    const handleDelete = async () => {
        setIsLoading(true)
        let res
        if (type === "note") {
            res = await deleteNote(id)
        } else {
            res = await deleteWhiteboard(id)
        }
        setIsLoading(false)
        if (res && res.success) {
            setIsDeleteOpen(false)
            router.refresh()
        }
    }

    return (
        <>
            <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/80 hover:bg-white shadow-sm rounded-full text-slate-500">
                            <MoreHorizonalIcon className="h-4 w-4" />
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
            </div>

            {/* Rename Dialog */}
            <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Rename {type === 'note' ? 'Note' : 'Whiteboard'}</DialogTitle>
                        <DialogDescription>
                            Enter a new name.
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
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Delete {type === 'note' ? 'Note' : 'Whiteboard'}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{title}</strong>? This action cannot be undone.
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

function MoreHorizonalIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
        </svg>
    )
}
