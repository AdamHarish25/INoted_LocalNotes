"use client"

import Link from "next/link"
import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createWhiteboard, createNote } from "@/app/actions"

interface Workspace {
    id: string
    name: string
}

interface CreateResourceModalProps {
    type: "note" | "whiteboard"
    workspaces: Workspace[]
    children: React.ReactNode
    defaultWorkspaceId?: string
    isGuest?: boolean
}

export function CreateResourceModal({ type, workspaces, children, defaultWorkspaceId, isGuest }: CreateResourceModalProps) {
    const [open, setOpen] = React.useState(false)
    const [title, setTitle] = React.useState("")
    const [workspaceId, setWorkspaceId] = React.useState(defaultWorkspaceId || "")
    const [isLoading, setIsLoading] = React.useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const formData = new FormData()
            formData.append("title", title)
            if (workspaceId) formData.append("workspace_id", workspaceId)

            if (type === "note") {
                await createNote(formData)
            } else {
                await createWhiteboard(formData)
            }
            setOpen(false)
            // Reset form
            setTitle("")
            setWorkspaceId("")
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isGuest ? "Account Required" : `Create ${type === "note" ? "Note" : "Whiteboard"}`}</DialogTitle>
                    <DialogDescription>
                        {isGuest ? "You need to log in to create new content." : `Enter a name for your new ${type}.`}
                    </DialogDescription>
                </DialogHeader>
                {isGuest ? (
                    <div className="flex justify-center py-4">
                        <Link href="/login">
                            <Button onClick={async (e) => {
                                e.stopPropagation()
                                const { signOut } = await import("@/app/actions")
                                await signOut()
                            }}>Log In / Sign Up</Button>
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                                placeholder={`Untitled ${type === "note" ? "Note" : "Whiteboard"}`}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="workspace" className="text-right">
                                Workspace
                            </Label>
                            <select
                                id="workspace"
                                className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={workspaceId}
                                onChange={(e) => setWorkspaceId(e.target.value)}
                            >
                                <option value="">None</option>
                                {workspaces.map(ws => (
                                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                                ))}
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
