"use client"

import { useEditor, EditorContent } from "@tiptap/react"

import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
// import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { EditorToolbar } from "./toolbar"
import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import * as Y from "yjs"

// Mock content handled by Yjs now

// Imports for Header UI
import { Button } from "@/components/ui/button"
import { Share, Cloud, Globe, Copy, Check, CircleDashed } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { SlashCommand, suggestion } from "./slash-command"

import Placeholder from "@tiptap/extension-placeholder"

import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'

export function TiptapEditor({ noteId = "example-document", initialContent, initialTitle, initialIsPublic, initialWorkspace, isReadOnly = false }: { noteId?: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialWorkspace?: string, isReadOnly?: boolean }) {
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

    // 1. Buat dokumen Yjs secara eksplisit dan stabil menggunakan useMemo
    const ydoc = useMemo(() => new Y.Doc(), [])

    useEffect(() => {
        // 2. Pass dokumen yang kita buat ke provider
        const newProvider = new HocuspocusProvider({
            url: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || "https://127.0.0.1:1234",
            name: noteId,
            document: ydoc, // PENTING: Gunakan doc yang sama
        })

        setProvider(newProvider)

        return () => {
            newProvider.destroy()
        }
    }, [noteId, ydoc])

    if (!provider) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
                    <div className="text-slate-400 dark:text-zinc-500 text-sm font-medium">Connecting to secure server...</div>
                </div>
            </div>
        )
    }

    // Pass ydoc ke komponen editor juga
    return <EditorWithProvider provider={provider} ydoc={ydoc} noteId={noteId} initialContent={initialContent} initialTitle={initialTitle} initialIsPublic={initialIsPublic} initialWorkspace={initialWorkspace} isReadOnly={isReadOnly} />
}

function EditorWithProvider({ provider, ydoc, noteId, initialContent, initialTitle, initialIsPublic, initialWorkspace, isReadOnly }: { provider: HocuspocusProvider, ydoc: Y.Doc, noteId: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialWorkspace?: string, isReadOnly?: boolean }) {
    const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Error" | "View Only">(isReadOnly ? "View Only" : "Saved")
    const [title, setTitle] = useState(initialTitle || "Untitled Note")
    const [isPublic, setIsPublic] = useState(initialIsPublic || false)
    const [isCopied, setIsCopied] = useState(false)

    const handleShareToggle = async () => {
        if (isReadOnly) return
        const newStatus = !isPublic
        setIsPublic(newStatus)
        const { updateNoteSharing } = await import("@/app/actions")
        const result = await updateNoteSharing(noteId, newStatus)
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
            // Prevent saving if read-only
            if (isReadOnly) return

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
    }, [noteId, isReadOnly])

    const editor = useEditor({
        immediatelyRender: false,
        editable: !isReadOnly, // Disable editing if read-only
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
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        editorProps: {
            attributes: {
                className: 'prose prose-lg prose-slate max-w-none focus:outline-none min-h-[500px]',
            },
        },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON()
            if (!isReadOnly) {
                setSaveStatus("Saving...")
                debouncedSave({ content: json })
            }
        },
    }, [provider, isReadOnly]) // Re-run if provider or readOnly changes

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



    const router = useRouter()

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, isOpen: boolean } | null>(null)
    const contextMenuRef = useRef<HTMLDivElement>(null)

    // Close menu on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null)
            }
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    // Context Menu Listener
    useEffect(() => {
        if (!editor) return

        const handleContextMenu = (e: MouseEvent) => {
            // Check if inside table
            if (editor.isActive('table')) {
                e.preventDefault()
                setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    isOpen: true
                })
            }
        }

        const viewDom = editor.view.dom
        viewDom.addEventListener('contextmenu', handleContextMenu)
        return () => {
            viewDom.removeEventListener('contextmenu', handleContextMenu)
        }
    }, [editor])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value
        setTitle(newTitle)
        setSaveStatus("Saving...")
        debouncedSave({ title: newTitle })
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background">
            {/* Integrated Header */}
            <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 dark:border-b-gray-500 mb-4 sticky top-0 bg-white dark:bg-card z-40 transition-colors">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-muted-foreground text-sm">
                        <button onClick={() => router.back()} className="p-1 border dark:border-border rounded bg-slate-50 dark:bg-muted hover:bg-slate-100 dark:hover:bg-muted/80 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        </button>
                        <span className="font-medium text-slate-700 dark:text-foreground truncate max-w-[100px] md:max-w-[200px]">{title}</span>
                    </div>

                    <div className={`flex items-center gap-1 text-slate-700 dark:text-muted-foreground text-xs`}>
                        {saveStatus === "Saved" ? <Cloud className="w-3 h-3 " /> : (saveStatus === "View Only" ? <Globe className="w-3 h-3" /> : <CircleDashed className={`w-3 h-3 animate-spin`} />)}
                        <span className="hidden md:inline">{saveStatus === 'Saved' ? 'Saved to Cloud' : saveStatus}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {!isReadOnly && <WorkspaceSelector noteId={noteId} initialWorkspaceName={initialWorkspace} />}

                    {!isReadOnly && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 md:h-9 md:w-auto md:px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full md:rounded-md p-0 md:p-2 border md:border-transparent border-slate-200 bg-slate-50 md:bg-transparent dark:text-muted-foreground dark:hover:text-primary dark:hover:bg-muted dark:bg-muted/10">
                                    <span className="mr-2 hidden md:inline">Share</span>
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
                                            <Globe className="w-5 h-5 text-slate-500 dark:text-muted-foreground" />
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
                                                className="flex-1 text-sm border p-2 rounded bg-slate-50 dark:bg-muted text-slate-600 dark:text-foreground outline-none"
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
                    )}
                </div>
            </div>

            <div className="relative w-full max-w-5xl md:max-w-3xl lg:max-w-4xl mb-10 mx-auto border border-gray-200 dark:border-gray-500 bg-white dark:bg-background dark:text-foreground p-4 md:p-16 rounded-lg min-h-screen flex flex-col gap-4 shadow-sm transition-colors">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    readOnly={isReadOnly}
                    placeholder="Note Title"
                    className="text-4xl font-extrabold border-none outline-none placeholder:text-slate-300 dark:placeholder:text-muted-foreground w-full bg-transparent pt-8 text-black dark:text-white disabled:cursor-not-allowed disabled:opacity-80"
                />

                <EditorContent editor={editor} className="dark:text-zinc-100" />

                {/* Custom Context Menu */}
                {contextMenu && contextMenu.isOpen && (
                    <div
                        ref={contextMenuRef}
                        className="fixed z-50 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-lg rounded-md overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="p-1 flex flex-col gap-0.5">
                            <button
                                onClick={() => {
                                    editor?.chain().focus().addRowAfter().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" /></svg>
                                Add Row Below
                            </button>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().deleteRow().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Row
                            </button>
                            <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />
                            <button
                                onClick={() => {
                                    editor?.chain().focus().deleteTable().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Table
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}