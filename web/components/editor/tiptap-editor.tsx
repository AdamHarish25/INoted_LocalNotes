"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
// import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { EditorToolbar } from "./toolbar"
import { useEffect, useState, useMemo } from "react"
import * as Y from "yjs"

// Mock content handled by Yjs now

// Imports for Header UI
import { Button } from "@/components/ui/button"
import { Share, Cloud, Globe, Copy, Check } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { SlashCommand, suggestion } from "./slash-command"

import Placeholder from "@tiptap/extension-placeholder"

import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

export function TiptapEditor({ noteId = "example-document", initialContent, initialTitle, initialIsPublic, initialWorkspace }: { noteId?: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialWorkspace?: string }) {
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

    // 1. Buat dokumen Yjs secara eksplisit dan stabil menggunakan useMemo
    const ydoc = useMemo(() => new Y.Doc(), [])

    useEffect(() => {
        // 2. Pass dokumen yang kita buat ke provider
        const newProvider = new HocuspocusProvider({
            url: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || "ws://127.0.0.1:1234",
            name: noteId,
            document: ydoc, // PENTING: Gunakan doc yang sama
        })

        setProvider(newProvider)

        return () => {
            newProvider.destroy()
        }
    }, [noteId, ydoc])

    if (!provider) {
        return <div className="p-8 text-gray-400">Connecting to collaboration server...</div>
    }

    // Pass ydoc ke komponen editor juga
    return <EditorWithProvider provider={provider} ydoc={ydoc} noteId={noteId} initialContent={initialContent} initialTitle={initialTitle} initialIsPublic={initialIsPublic} initialWorkspace={initialWorkspace} />
}

function EditorWithProvider({ provider, ydoc, noteId, initialContent, initialTitle, initialIsPublic, initialWorkspace }: { provider: HocuspocusProvider, ydoc: Y.Doc, noteId: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialWorkspace?: string }) {
    const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Error">("Saved")
    const [title, setTitle] = useState(initialTitle || "Untitled Note")
    const [isPublic, setIsPublic] = useState(initialIsPublic || false)
    const [isCopied, setIsCopied] = useState(false)

    const handleShareToggle = async () => {
        const newStatus = !isPublic
        setIsPublic(newStatus)
        const { updateNoteSharing } = await import("@/app/actions")
        await updateNoteSharing(noteId, newStatus)
    }

    const copyLink = () => {
        const url = `${window.location.origin}/notes/${noteId}`
        navigator.clipboard.writeText(url)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    // Simple debounce implementation
    const debouncedSave = useMemo(() => {
        let timeoutId: NodeJS.Timeout
        return (data: { content?: any, title?: string }) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                // Sanitize payload to remove any Proxy/Client References causing Server Action errors
                // This fixes: "Cannot access checked on the server..."
                const sanitizedData = JSON.parse(JSON.stringify(data))

                const { updateNote } = await import("@/app/actions")
                const result = await updateNote(noteId, sanitizedData)

                if (result.success) {
                    setSaveStatus("Saved")
                } else {
                    setSaveStatus("Error")
                }
            }, 500)
        }
    }, [noteId])

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                history: false,
            } as any),
            Collaboration.configure({
                document: ydoc,
            }),
            SlashCommand.configure({
                suggestion,
            }),
            Placeholder.configure({
                placeholder: 'Type / to open slash commands',
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
        ],
        editorProps: {
            attributes: {
                className: 'prose prose-lg prose-slate max-w-none focus:outline-none min-h-[500px]',
            },
        },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON()
            setSaveStatus("Saving...")
            debouncedSave({ content: json })
        },
    }, [provider]) // Re-run if provider changes

    // HYDRATION LOGIC:
    // If the Yjs document is empty (because server has no data),
    // and we have initial content from DB, force set the content.
    useEffect(() => {
        if (editor && !editor.isDestroyed && initialContent) {
            const fragment = ydoc.getXmlFragment('default')

            // Check if Yjs is effectively empty.
            if (fragment.toArray().length === 0) {
                // Prevent duplicate hydration if yjs already has sync going on
                // but here we assume if XML is empty, we must be the first.
                editor.commands.setContent(initialContent)
            }
        }
    }, [editor, initialContent, ydoc])

    // Force save on checkbox toggle (TaskItem)
    // Tiptap's onUpdate sometimes misses attribute changes in collaborative environments
    // or if the event is swallowed by the NodeView.
    // Force sync of checkbox state to Tiptap model
    useEffect(() => {
        if (!editor) return

        const handleCheckboxChange = (e: Event) => {
            const target = e.target as HTMLInputElement
            if (target.tagName === 'INPUT' && target.type === 'checkbox') {
                const item = target.closest('li[data-type="taskItem"]')
                if (item) {
                    // Normalize position logic
                    // posAtDOM(item, 0) usually points to the start of the content inside the node
                    // So the node itself starts ideally at pos - 1 if it's a block node context, or pos?
                    // Let's verify.
                    let pos = editor.view.posAtDOM(item, 0)

                    // Check directly at pos
                    let node = editor.state.doc.nodeAt(pos)

                    // If not found or wrong type, try shifting. 
                    // Tiptap/ProseMirror indexing can be tricky with NodeViews.
                    if (!node || node.type.name !== 'taskItem') {
                        // Try -1 (common for block start vs content start)
                        const prevPos = pos - 1
                        const prevNode = editor.state.doc.nodeAt(prevPos)
                        if (prevNode && prevNode.type.name === 'taskItem') {
                            pos = prevPos
                            node = prevNode
                        }
                    }

                    if (node && node.type.name === 'taskItem') {
                        // Use chain to ensure all Tiptap/Yjs side effects trigger (Collaboration, History)
                        editor.chain().setNodeSelection(pos).updateAttributes('taskItem', { checked: target.checked }).run()
                        setSaveStatus("Saving...")
                    }
                }
            }
        }

        const viewDom = editor.view.dom
        viewDom.addEventListener('change', handleCheckboxChange)

        return () => {
            viewDom.removeEventListener('change', handleCheckboxChange)
        }
    }, [editor])



    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value
        setTitle(newTitle)
        setSaveStatus("Saving...")
        debouncedSave({ title: newTitle })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Integrated Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <span className="p-1 border rounded bg-slate-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        </span>
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{title}</span>
                    </div>

                    <div className={`flex items-center gap-1 text-slate-700 text-xs ${saveStatus === "Saved" ? "animate-none" : "animate-pulse"}`}>
                        <Cloud className="w-3 h-3" />
                        <span>{saveStatus === 'Saved' ? 'Saved to Cloud' : saveStatus}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <WorkspaceSelector noteId={noteId} initialWorkspaceName={initialWorkspace} />

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                                <span className="mr-2">Share</span>
                                <Share className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Share Note</DialogTitle>
                                <DialogDescription>
                                    Publish this note to the web to share it with others.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-slate-500" />
                                        <span className="font-medium">Publish to web</span>
                                    </div>
                                    <Button
                                        variant={isPublic ? "default" : "outline"}
                                        onClick={handleShareToggle}
                                    >
                                        {isPublic ? "Published" : "Private"}
                                    </Button>
                                </div>

                                {isPublic && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            className="flex-1 text-sm border p-2 rounded bg-slate-50 text-slate-600 outline-none"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/notes/${noteId}`}
                                        />
                                        <Button onClick={copyLink} size="icon" variant="outline">
                                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="relative w-full max-w-4xl mb-10 mx-auto border border-gray-500 bg-white p-16 text-black rounded-lg min-h-screen flex flex-col gap-4">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note Title"
                    className="text-4xl font-extrabold border-none outline-none placeholder:text-slate-300 w-full bg-transparent pt-8"
                />

                <EditorContent editor={editor} />
            </div>
        </div>
    )
}