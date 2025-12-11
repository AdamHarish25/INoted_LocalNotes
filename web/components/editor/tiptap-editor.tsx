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
import { Share, Cloud } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"

export function TiptapEditor({ noteId = "example-document", initialContent, initialWorkspace }: { noteId?: string, initialContent?: any, initialWorkspace?: string }) {
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

    // 1. Buat dokumen Yjs secara eksplisit dan stabil menggunakan useMemo
    const ydoc = useMemo(() => new Y.Doc(), [])

    useEffect(() => {
        // 2. Pass dokumen yang kita buat ke provider
        const newProvider = new HocuspocusProvider({
            url: "ws://127.0.0.1:1234",
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
    return <EditorWithProvider provider={provider} ydoc={ydoc} noteId={noteId} initialContent={initialContent} initialWorkspace={initialWorkspace} />
}

function EditorWithProvider({ provider, ydoc, noteId, initialContent, initialWorkspace }: { provider: HocuspocusProvider, ydoc: Y.Doc, noteId: string, initialContent?: any, initialWorkspace?: string }) {
    const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Error">("Saved")

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                history: false,
            } as any),
            Collaboration.configure({
                document: ydoc,
            }),
        ],
        editorProps: {
            attributes: {
                className: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] p-8',
            },
        },
        onUpdate: ({ editor }) => {
            setSaveStatus("Saving...")
            handleSave(editor.getJSON())
        },
    }, [provider]) // Re-run if provider changes

    // HYDRATION LOGIC:
    // If the Yjs document is empty (because server has no data),
    // and we have initial content from DB, force set the content.
    useEffect(() => {
        if (editor && !editor.isDestroyed && initialContent) {
            const fragment = ydoc.getXmlFragment('default')

            // Check if Yjs is effectively empty.
            // Tiptap's "empty" doc usually has one empty paragraph, but Yjs might be truly empty (0 length).
            if (fragment.toArray().length === 0) {
                // Prevent duplicate hydration if yjs already has sync going on
                // but here we assume if XML is empty, we must be the first.
                editor.commands.setContent(initialContent)
            }
        }
    }, [editor, initialContent, ydoc])

    // Simple debounce implementation
    const handleSave = useMemo(() => {
        let timeoutId: NodeJS.Timeout
        return (content: any) => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                const { updateNote } = await import("@/app/actions")

                // Extract title logic temporarily removed or ignored as action doesn't support it yet
                // ... code kept for future reference or just call updateNote directly
                const result = await updateNote(noteId, content)

                if (result.success) {
                    setSaveStatus("Saved")
                } else {
                    setSaveStatus("Error")
                }
            }, 1000)
        }
    }, [noteId])

    // State for the document title
    const [title, setTitle] = useState("Untitled Note")

    // Update title logic when content changes
    useEffect(() => {
        if (editor) {
            const updateTitle = () => {
                const json = editor.getJSON()
                const headingNode = json.content?.find((node: any) => node.type === 'heading' && node.attrs?.level === 1)

                if (headingNode && headingNode.content && headingNode.content.length > 0) {
                    // Extract text from heading node
                    const text = headingNode.content.map((c: any) => c.text).join("")
                    setTitle(text || "Untitled Note")
                } else {
                    setTitle("Untitled Note")
                }
            }

            // Run initially
            updateTitle()

            // Run on updates
            editor.on('update', updateTitle)

            return () => {
                editor.off('update', updateTitle)
            }
        }
    }, [editor])

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

                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                        <Cloud className="w-3 h-3" />
                        <span>{saveStatus === 'Saved' ? 'Saved to Cloud' : saveStatus}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <WorkspaceSelector noteId={noteId} initialWorkspaceName={initialWorkspace} />

                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                        <span className="mr-2">Share</span>
                        <Share className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="relative w-full max-w-4xl mx-auto bg-white rounded-lg min-h-screen">
                <EditorContent editor={editor} />
                {editor && <EditorToolbar editor={editor} />}
            </div>
        </div>
    )
}