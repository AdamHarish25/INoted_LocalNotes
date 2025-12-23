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
import { updateNote, updateWhiteboard, updateFlowchart, deleteNote, deleteWhiteboard, deleteFlowchart } from "@/app/actions"

interface ResourceOptionsProps {
    id: string
    title: string
    type: "note" | "whiteboard" | "flowchart"
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
        } else if (type === "whiteboard") {
            res = await updateWhiteboard(id, { title: name })
        } else {
            res = await updateFlowchart(id, { title: name })
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
        } else if (type === "whiteboard") {
            res = await deleteWhiteboard(id)
        } else {
            res = await deleteFlowchart(id)
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
                        <DialogTitle>Rename {type === 'note' ? 'Note' : (type === 'whiteboard' ? 'Whiteboard' : 'Flowchart')}</DialogTitle>
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
                        <DialogTitle>Delete {type === 'note' ? 'Note' : (type === 'whiteboard' ? 'Whiteboard' : 'Flowchart')}</DialogTitle>
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
