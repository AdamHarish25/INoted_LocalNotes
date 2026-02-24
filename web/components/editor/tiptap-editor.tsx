"use client"

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react"

import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import SupabaseProvider from "@/lib/y-supabase"
import { EditorToolbar } from "./toolbar"
import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import * as Y from "yjs"
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import CodeBlockComponent from './code-block-component'

const lowlight = createLowlight(all)

// Mock content handled by Yjs now

// Imports for Header UI
import { Button } from "@/components/ui/button"
import { Share, Cloud, Globe, Copy, Check, CircleDashed, Github, Network } from "lucide-react"
import { WorkspaceSelector } from "@/components/workspace-selector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WhiteboardExtension } from "./whiteboard-extension"
import { FlowchartExtension } from "./flowchart-extension"
import { ResizableImageExtension } from "./image-extension"
import { createClient } from "@/utils/supabase/client"


import { SlashCommand, suggestion } from "./slash-command"

import Placeholder from "@tiptap/extension-placeholder"

import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'

import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import { BubbleMenu } from '@tiptap/react/menus'
import { default as BubbleMenuExtension } from '@tiptap/extension-bubble-menu'
import { Bold, Italic, Strikethrough, Code, AlignLeft, AlignCenter, AlignRight, FileText } from 'lucide-react'
import TextAlign from '@tiptap/extension-text-align'

export function TiptapEditor({ noteId = "example-document", initialContent, initialTitle, initialIsPublic, initialAllowPublicEditing, initialWorkspace, isReadOnly = false, userName = "Guest", userColor }: { noteId?: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialAllowPublicEditing?: boolean, initialWorkspace?: string, isReadOnly?: boolean, userName?: string, userColor?: string }) {
    const [provider, setProvider] = useState<SupabaseProvider | null>(null)
    const [supabase] = useState(() => createClient())

    // 1. Buat dokumen Yjs secara eksplisit dan stabil menggunakan useMemo
    const ydoc = useMemo(() => new Y.Doc(), [])

    useEffect(() => {
        // 2. Pass dokumen yang kita buat ke provider
        const newProvider = new SupabaseProvider(ydoc, supabase, {
            channel: `note-collab-${noteId}`,
            id: noteId,
            tableName: 'notes',
            columnName: 'content'
        } as any)

        setProvider(newProvider)

        return () => {
            newProvider.destroy()
        }
    }, [noteId, ydoc, supabase])

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
    return <EditorWithProvider provider={provider} ydoc={ydoc} noteId={noteId} initialContent={initialContent} initialTitle={initialTitle} initialIsPublic={initialIsPublic} initialAllowPublicEditing={initialAllowPublicEditing} initialWorkspace={initialWorkspace} isReadOnly={isReadOnly} userName={userName} userColor={userColor} />
}

function EditorWithProvider({ provider, ydoc, noteId, initialContent, initialTitle, initialIsPublic, initialAllowPublicEditing, initialWorkspace, isReadOnly, userName, userColor }: { provider: SupabaseProvider, ydoc: Y.Doc, noteId: string, initialContent?: any, initialTitle?: string, initialIsPublic?: boolean, initialAllowPublicEditing?: boolean, initialWorkspace?: string, isReadOnly?: boolean, userName: string, userColor?: string }) {
    const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Error" | "View Only">(isReadOnly ? "View Only" : "Saved")
    const [title, setTitle] = useState(initialTitle || "Untitled Note")
    const [isPublic, setIsPublic] = useState(initialIsPublic || false)
    const [allowPublicEditing, setAllowPublicEditing] = useState(initialAllowPublicEditing || false)
    const [isCopied, setIsCopied] = useState(false)
    const hasHydrated = useRef(false)

    // Generate color from name if not provided
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + "00000".substring(0, 6 - c.length) + c;
    }

    const finalColor = userColor || stringToColor(userName || 'User')

    const handleUpdateSharing = async (newIsPublic: boolean, newAllowEditing: boolean) => {
        if (isReadOnly) return

        setIsPublic(newIsPublic)
        setAllowPublicEditing(newAllowEditing)

        const { updateNoteSharing } = await import("@/app/actions")
        await updateNoteSharing(noteId, newIsPublic, newAllowEditing)
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
                codeBlock: false, // Disable default codeBlock to use Lowlight
            } as any),
            Collaboration.configure({
                document: ydoc,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: { name: userName, color: finalColor }
            }),
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockComponent)
                }
            }).configure({
                lowlight,
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
            WhiteboardExtension,
            FlowchartExtension,
            ResizableImageExtension,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            BubbleMenuExtension.configure({
                pluginKey: 'bubbleMenu', // Optional
            }),
        ],
        editorProps: {
            attributes: {
                className: 'prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px]',
            },
        },
        onUpdate: ({ editor }) => {
            const json = editor.getJSON()
            if (!isReadOnly) {
                setSaveStatus("Saving...")
                debouncedSave({ content: json })
            }

            // Provide context to the Mistral AI assistant EVEN if it's read-only
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('inoted_ai_context', `Document Name: ${title}\n\nCurrent textual content:\n${editor.getText()}`);
            }
        },
    }, [provider, isReadOnly]) // Re-run if provider or readOnly changes

    // Sync Status State
    const [isSynced, setIsSynced] = useState(false)
    const [peerCount, setPeerCount] = useState(0)

    // Provide initial context to AI when editor is fully synced/loaded
    useEffect(() => {
        if (isSynced && editor && typeof window !== 'undefined') {
            window.localStorage.setItem('inoted_ai_context', `Document Name: ${title}\n\nCurrent textual content:\n${editor.getText()}`);
        }
    }, [isSynced, editor, title])

    useEffect(() => {
        if (provider) {
            const handleSync = () => setIsSynced(true)
            const handleAwarenessUpdate = () => {
                setPeerCount(provider.awareness.getStates().size)
            }

            provider.on('synced', handleSync)
            provider.awareness.on('update', handleAwarenessUpdate)

            return () => {
                provider.off('synced', handleSync)
                provider.awareness.off('update', handleAwarenessUpdate)
            }
        }
    }, [provider])

    // HYDRATION LOGIC:
    // Prevent duplication by ensuring only ONE client hydrates the document from initialContent.
    // We use a "Leader Election" strategy based on Client ID + Grace Period.
    useEffect(() => {
        if (!isSynced || !editor || editor.isDestroyed || !initialContent || hasHydrated.current) return

        // Check if doc is already populated by peers
        const fragment = ydoc.getXmlFragment('default')
        if (fragment.toArray().length > 0) {
            hasHydrated.current = true
            return
        }

        // Delay hydration to allow awareness/peers to sync
        const timer = setTimeout(() => {
            // Re-check content (maybe peers sent it during timeout)
            if (ydoc.getXmlFragment('default').toArray().length > 0) {
                hasHydrated.current = true
                return
            }

            // Leader Election: Am I the "lowest" client ID among connected peers?
            // If so, I am responsible for hydration.
            const states = provider?.awareness.getStates()
            if (states) {
                const clientIds = Array.from(states.keys()).sort((a, b) => a - b)
                const myClientId = ydoc.clientID
                const isLeader = clientIds.length > 0 && clientIds[0] === myClientId

                // If I am leader (or alone), I hydrate.
                // If there are peers but I am leader, I hydrate.
                // If there are peers and I am NOT leader, I do nothing and wait for leader.
                if (isLeader || clientIds.length === 0) {
                    // Double check emptiness
                    if (ydoc.getXmlFragment('default').toArray().length === 0) {
                        console.log("Hydrating as Leader/Solo...", myClientId)
                        editor.commands.setContent(initialContent)
                        hasHydrated.current = true
                    }
                } else {
                    console.log("Waiting for leader to hydrate...", clientIds[0])
                }
            }
        }, 1000) // 1s grace period for awareness propagation

        return () => clearTimeout(timer)
    }, [isSynced, editor, initialContent, ydoc, peerCount, provider])

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

    // Table Dialog State
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
    const [tableRows, setTableRows] = useState(3)
    const [tableCols, setTableCols] = useState(3)
    const [pendingPos, setPendingPos] = useState<number | null>(null) // Store position

    // Whiteboard Dialog State
    const [isWhiteboardDialogOpen, setIsWhiteboardDialogOpen] = useState(false)
    const [wbTab, setWbTab] = useState<'list' | 'link'>('list')
    const [whiteboards, setWhiteboards] = useState<any[]>([])
    const [selectedWhiteboardId, setSelectedWhiteboardId] = useState<string | null>(null)
    const [linkInput, setLinkInput] = useState('')
    const [isLoadingWhiteboards, setIsLoadingWhiteboards] = useState(false)

    // Fetch Whiteboards
    useEffect(() => {
        if (isWhiteboardDialogOpen && wbTab === 'list') {
            setIsLoadingWhiteboards(true)
            import("@/app/actions").then(({ getWhiteboards }) => {
                getWhiteboards().then(res => {
                    if (res.success && res.data) setWhiteboards(res.data)
                    setIsLoadingWhiteboards(false)
                })
            })
        }
    }, [isWhiteboardDialogOpen, wbTab])

    // Flowchart Dialog State
    const [isFlowchartDialogOpen, setIsFlowchartDialogOpen] = useState(false)
    const [fcTab, setFcTab] = useState<'list' | 'link'>('list')
    const [flowcharts, setFlowcharts] = useState<any[]>([])
    const [selectedFlowchart, setSelectedFlowchart] = useState<any | null>(null)
    const [fcLinkInput, setFcLinkInput] = useState('')
    const [isLoadingFlowcharts, setIsLoadingFlowcharts] = useState(false)

    // Fetch Flowcharts
    useEffect(() => {
        if (isFlowchartDialogOpen && fcTab === 'list') {
            setIsLoadingFlowcharts(true)
            import("@/app/actions").then(({ getFlowcharts }) => {
                getFlowcharts().then(res => {
                    if (res.success && res.data) setFlowcharts(res.data)
                    setIsLoadingFlowcharts(false)
                })
            })
        }
    }, [isFlowchartDialogOpen, fcTab])

    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file.")
            return
        }

        setIsUploadingImage(true)

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${noteId}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`
            const bucketName = 'images'

            const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)

            if (uploadError) {
                console.error("Upload error", uploadError)
                alert(`Failed to upload image: ${uploadError.message}. Ensure 'images' bucket exists and is public.`)
                setIsUploadingImage(false)
                return
            }

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath)

            if (editor && !isReadOnly) {
                const chain = editor.chain().focus()
                if (pendingPos !== null) {
                    chain.setTextSelection(pendingPos)
                }
                chain.insertContent({
                    type: 'image',
                    attrs: { src: publicUrl }
                }).run()
            }

        } catch (e) {
            console.error(e)
            alert("An error occurred during upload.")
        } finally {
            setIsUploadingImage(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleConfirmInsertFlowchart = () => {
        let finalId = null
        let preview = null
        let title = "Untitled Flowchart"

        if (fcTab === 'list' && selectedFlowchart) {
            finalId = selectedFlowchart.id
            preview = selectedFlowchart.preview_img
            title = selectedFlowchart.title
        } else {
            if (fcLinkInput.includes('/flowchart/')) {
                finalId = fcLinkInput.split('/flowchart/')[1].split('?')[0]
            } else {
                finalId = fcLinkInput
            }
        }

        if (finalId && finalId.trim() !== '' && editor && !isReadOnly) {
            const chain = editor.chain().focus()
            if (pendingPos !== null) {
                chain.setTextSelection(pendingPos)
            }
            chain.insertContent({
                type: 'flowchart',
                attrs: { id: finalId, preview, title }
            }).run()
        }
        setIsFlowchartDialogOpen(false)
        setSelectedFlowchart(null)
        setFcLinkInput('')
    }


    const handleConfirmInsertWhiteboard = () => {
        let finalId = null
        if (wbTab === 'list') {
            finalId = selectedWhiteboardId
        } else {
            if (linkInput.includes('/whiteboard/')) {
                finalId = linkInput.split('/whiteboard/')[1].split('?')[0]
            } else {
                finalId = linkInput
            }
        }

        if (finalId && finalId.trim() !== '' && editor && !isReadOnly) {
            const chain = editor.chain().focus()
            if (pendingPos !== null) {
                chain.setTextSelection(pendingPos)
            }
            chain.insertContent({
                type: 'whiteboard',
                attrs: { id: finalId }
            }).run()
        }
        setIsWhiteboardDialogOpen(false)
        // Reset
        setSelectedWhiteboardId(null)
        setLinkInput('')
    }

    // Event Listeners for Slash Commands
    useEffect(() => {
        const handleOpenTableDialog = (e: Event) => {
            const detail = (e as CustomEvent).detail
            setPendingPos(detail.pos)
            setIsTableDialogOpen(true)
        }

        const handleInsertWhiteboard = (e: Event) => {
            const detail = (e as CustomEvent).detail
            setPendingPos(detail.pos)
            setIsWhiteboardDialogOpen(true)
        }

        const handleInsertFlowchart = (e: Event) => {
            const detail = (e as CustomEvent).detail
            setPendingPos(detail.pos)
            setIsFlowchartDialogOpen(true)
        }

        const handleInsertImage = (e: Event) => {
            const detail = (e as CustomEvent).detail
            setPendingPos(detail.pos)
            fileInputRef.current?.click()
        }

        window.addEventListener('open-table-dialog', handleOpenTableDialog)
        window.addEventListener('insert-whiteboard', handleInsertWhiteboard)
        window.addEventListener('insert-flowchart', handleInsertFlowchart)
        window.addEventListener('insert-image', handleInsertImage)

        return () => {
            window.removeEventListener('open-table-dialog', handleOpenTableDialog)
            window.removeEventListener('insert-whiteboard', handleInsertWhiteboard)
            window.removeEventListener('insert-flowchart', handleInsertFlowchart)
            window.removeEventListener('insert-image', handleInsertImage)
        }
    }, [editor, isReadOnly])

    const handleConfirmInsertTable = () => {
        if (editor && !isReadOnly) {
            let chain = editor.chain().focus()
            if (pendingPos !== null) {
                chain = chain.setTextSelection(pendingPos)
            }
            chain.insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run()
        }
        setIsTableDialogOpen(false)
    }

    const handleExportPDF = () => {
        window.print()
    }

    // Git Dialog State
    const [isGitDialogOpen, setIsGitDialogOpen] = useState(false)
    const [gitRepoUrl, setGitRepoUrl] = useState('')
    const [gitToken, setGitToken] = useState('')
    const [gitExportType, setGitExportType] = useState<'markdown' | 'gist'>('markdown')
    const [gitStatus, setGitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const jsonToMarkdown = (json: any): string => {
        if (!json || !json.content) return ''

        const processNode = (node: any): string => {
            if (node.type === 'text') {
                let text = node.text || ''
                if (node.marks) {
                    node.marks.forEach((mark: any) => {
                        if (mark.type === 'bold') text = `**${text}**`
                        else if (mark.type === 'italic') text = `*${text}*`
                        else if (mark.type === 'strike') text = `~~${text}~~`
                        else if (mark.type === 'code') text = `\`${text}\``
                    })
                }
                return text
            }

            const children = node.content ? node.content.map(processNode).join('') : ''

            switch (node.type) {
                case 'heading':
                    return '#'.repeat(node.attrs?.level || 1) + ' ' + children + '\n\n'
                case 'paragraph':
                    return children + '\n\n'
                case 'codeBlock':
                    return '```' + (node.attrs?.language || '') + '\n' + children + '\n```\n\n'
                case 'bulletList':
                    return node.content.map((li: any) => '- ' + (li.content ? li.content.map(processNode).join('').trim() : '')).join('\n') + '\n\n'
                case 'orderedList':
                    return node.content.map((li: any, i: number) => `${i + 1}. ` + (li.content ? li.content.map(processNode).join('').trim() : '')).join('\n') + '\n\n'
                case 'listItem':
                    return children // Handled by parent
                case 'taskItem':
                    return `- [${node.attrs?.checked ? 'x' : ' '}] ` + children + '\n'
                case 'taskList':
                    return children + '\n'
                case 'table':
                    // Basic table support - simplified
                    return '\n[Table]\n' + children + '\n'
                case 'tableRow':
                    return '| ' + (node.content ? node.content.map((c: any) => processNode(c).trim()).join(' | ') : '') + ' |\n'
                case 'tableCell':
                case 'tableHeader':
                    return children
                default:
                    return children
            }
        }

        return json.content.map(processNode).join('').trim()
    }

    const handleGitAction = async () => {
        setGitStatus('loading')

        try {
            const markdown = jsonToMarkdown(editor?.getJSON())

            if (gitExportType === 'markdown') {
                navigator.clipboard.writeText(markdown)
                setGitStatus('success')
                setTimeout(() => setGitStatus('idle'), 2000)
            } else if (gitExportType === 'gist') {
                if (!gitToken) {
                    alert("Please enter a GitHub Personal Access Token.")
                    setGitStatus('idle')
                    return
                }

                // POST to GitHub Gist
                const response = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${gitToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        description: `Note: ${title}`,
                        public: false,
                        files: {
                            [`${title.replace(/\s+/g, '_') || 'note'}.md`]: {
                                content: markdown
                            }
                        }
                    })
                })

                if (response.ok) {
                    setGitStatus('success')
                    setTimeout(() => {
                        setGitStatus('idle')
                        setIsGitDialogOpen(false)
                    }, 1500)
                } else {
                    const err = await response.json()
                    console.error('Gist Error:', err)
                    setGitStatus('error')
                }
            }
        } catch (e) {
            console.error(e)
            setGitStatus('error')
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-background">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
            {/* Git Integration Dialog */}
            <Dialog open={isGitDialogOpen} onOpenChange={setIsGitDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Github className="w-5 h-5" />
                            Git Integration
                        </DialogTitle>
                        <DialogDescription>
                            Sync your notes with GitHub or export as Markdown.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                        <button
                            onClick={() => setGitExportType('markdown')}
                            className={`pb-2 text-sm font-medium transition-colors ${gitExportType === 'markdown' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Copy Markdown
                        </button>
                        <button
                            onClick={() => setGitExportType('gist')}
                            className={`pb-2 text-sm font-medium transition-colors ${gitExportType === 'gist' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Post to Gist
                        </button>
                    </div>

                    <div className="space-y-4 py-2">
                        {gitExportType === 'markdown' && (
                            <div className="p-4 bg-muted rounded-md border text-sm text-muted-foreground">
                                <p>Clicking "Copy" will convert this note to Markdown and copy it to your clipboard, ready to be pasted into any Git repository.</p>
                            </div>
                        )}

                        {gitExportType === 'gist' && (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label>GitHub Personal Access Token</Label>
                                    <Input
                                        type="password"
                                        value={gitToken}
                                        onChange={(e) => setGitToken(e.target.value)}
                                        placeholder="ghp_..."
                                    />
                                    <p className="text-[10px] text-muted-foreground">Token needs 'gist' scope permissions.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-between items-center">
                        <div className="text-sm">
                            {gitStatus === 'success' && <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Done!</span>}
                            {gitStatus === 'error' && <span className="text-red-600">Failed. Check console/token.</span>}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsGitDialogOpen(false)}>Close</Button>
                            <Button onClick={handleGitAction} disabled={gitStatus === 'loading'}>
                                {gitStatus === 'loading' ? 'Processing...' : (gitExportType === 'markdown' ? 'Copy to Clipboard' : 'Create Secret Gist')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Table Configuration Dialog */}
            <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Insert Table</DialogTitle>
                        <DialogDescription>
                            Configure the table dimensions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="rows" className="text-right">
                                Rows
                            </Label>
                            <Input
                                id="rows"
                                type="number"
                                min={1}
                                max={20}
                                value={tableRows}
                                onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cols" className="text-right">
                                Columns
                            </Label>
                            <Input
                                id="cols"
                                type="number"
                                min={1}
                                max={10}
                                value={tableCols}
                                onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmInsertTable}>Insert Table</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Whiteboard Insertion Dialog */}
            <Dialog open={isWhiteboardDialogOpen} onOpenChange={setIsWhiteboardDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Insert Whiteboard</DialogTitle>
                        <DialogDescription>Select an existing whiteboard or paste a link.</DialogDescription>
                        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setWbTab('list')} className={`pb-2 px-2 text-sm transition-colors ${wbTab === 'list' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>My Whiteboards</button>
                            <button onClick={() => setWbTab('link')} className={`pb-2 px-2 text-sm transition-colors ${wbTab === 'link' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Link</button>
                        </div>
                    </DialogHeader>

                    {wbTab === 'list' && (
                        <div className="min-h-[200px] border rounded-md p-0 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                            <ScrollArea className="h-[250px] p-2">
                                {isLoadingWhiteboards ? (
                                    <div className="flex items-center justify-center h-full py-10 text-gray-400">Loading your whiteboards...</div>
                                ) : whiteboards.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                                        <CircleDashed className="w-8 h-8 opacity-50" />
                                        <p>No whiteboards found.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {whiteboards.map(wb => (
                                            <button
                                                key={wb.id}
                                                className={`flex flex-col items-start w-full text-left p-3 rounded-md border transition-all ${selectedWhiteboardId === wb.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500/50' : 'border-transparent bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                                onClick={() => setSelectedWhiteboardId(wb.id)}
                                            >
                                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{wb.title || "Untitled Whiteboard"}</span>
                                                <span className="text-xs text-gray-400">Last updated: {new Date(wb.updated_at).toLocaleDateString()}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {wbTab === 'link' && (
                        <div className="py-8 space-y-4">
                            <div className="space-y-2">
                                <Label>Whiteboard Link</Label>
                                <Input
                                    placeholder="Paste whiteboard URL here..."
                                    value={linkInput}
                                    onChange={e => setLinkInput(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                You can create a new whiteboard, copy its link, and paste it here to embed it.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsWhiteboardDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmInsertWhiteboard} disabled={(wbTab === 'list' && !selectedWhiteboardId) || (wbTab === 'link' && !linkInput.trim())}>Insert Whiteboard</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Flowchart Insertion Dialog */}
            <Dialog open={isFlowchartDialogOpen} onOpenChange={setIsFlowchartDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Insert Flowchart</DialogTitle>
                        <DialogDescription>Select an existing flowchart or paste a link.</DialogDescription>
                        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setFcTab('list')} className={`pb-2 px-2 text-sm transition-colors ${fcTab === 'list' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>My Flowcharts</button>
                            <button onClick={() => setFcTab('link')} className={`pb-2 px-2 text-sm transition-colors ${fcTab === 'link' ? 'border-b-2 border-blue-500 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'}`}>Link</button>
                        </div>
                    </DialogHeader>

                    {fcTab === 'list' && (
                        <div className="min-h-[200px] border rounded-md p-0 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                            <ScrollArea className="h-[250px] p-2">
                                {isLoadingFlowcharts ? (
                                    <div className="flex items-center justify-center h-full py-10 text-gray-400">Loading your flowcharts...</div>
                                ) : flowcharts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
                                        <Network className="w-8 h-8 opacity-50" />
                                        <p>No flowcharts found.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {flowcharts.map(fc => (
                                            <button
                                                key={fc.id}
                                                className={`flex items-start w-full text-left p-2 rounded-md border transition-all gap-3 ${selectedFlowchart?.id === fc.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500/50' : 'border-transparent bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                                onClick={() => setSelectedFlowchart(fc)}
                                            >
                                                {fc.preview_img ? (
                                                    <div className="w-16 h-12 rounded bg-slate-200 overflow-hidden border">
                                                        <img src={fc.preview_img} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-12 rounded bg-slate-100 dark:bg-slate-900 flex items-center justify-center border">
                                                        <Network className="w-6 h-6 text-slate-300" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{fc.title || "Untitled Flowchart"}</span>
                                                    <span className="text-xs text-gray-400">Last updated: {new Date(fc.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {fcTab === 'link' && (
                        <div className="py-8 space-y-4">
                            <div className="space-y-2">
                                <Label>Flowchart Link</Label>
                                <Input
                                    placeholder="Paste flowchart URL here..."
                                    value={fcLinkInput}
                                    onChange={e => setFcLinkInput(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                You can create a new flowchart, copy its link, and paste it here.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFlowchartDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmInsertFlowchart} disabled={(fcTab === 'list' && !selectedFlowchart) || (fcTab === 'link' && !fcLinkInput.trim())}>Insert Flowchart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Integrated Header */}
            <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 dark:border-b-gray-500 mb-4 sticky top-0 bg-white dark:bg-card z-40 transition-colors print-hidden">
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
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsGitDialogOpen(true)}
                        title="Git Integration"
                        className="text-slate-500 hover:text-slate-700 dark:text-muted-foreground dark:hover:text-primary"
                    >
                        <Github className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleExportPDF}
                        title="Export to PDF"
                        className="text-slate-500 hover:text-slate-700 dark:text-muted-foreground dark:hover:text-primary"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </Button>


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
                                            <div className="flex flex-col">
                                                <span className="font-medium">Publish to web</span>
                                                <span className="text-xs text-slate-500">Anyone with the link can view</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant={isPublic ? "default" : "outline"}
                                            onClick={() => handleUpdateSharing(!isPublic, allowPublicEditing)}
                                        >
                                            {isPublic ? "Published" : "Private"}
                                        </Button>
                                    </div>

                                    {isPublic && (
                                        <>
                                            <div className="flex items-center justify-between pl-7 border-l-2 border-slate-100 dark:border-zinc-800 ml-2.5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">Allow Public Editing</span>
                                                    <span className="text-xs text-slate-500">Visitors can edit this note</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={allowPublicEditing}
                                                        onChange={(e) => handleUpdateSharing(isPublic, e.target.checked)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    className="flex-1 text-sm border p-2 rounded bg-slate-50 dark:bg-muted text-slate-600 dark:text-foreground outline-none"
                                                    readOnly
                                                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/notes/${noteId}`}
                                                />
                                                <Button onClick={copyLink} size="icon" variant="outline">
                                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="print-area relative w-full min-w-0 max-w-5xl md:max-w-3xl lg:max-w-4xl mb-10 mx-auto border border-gray-200 dark:border-gray-500 bg-white dark:bg-background dark:text-foreground p-4 md:p-16 rounded-lg min-h-screen flex flex-col gap-4 shadow-sm transition-colors">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    readOnly={isReadOnly}
                    placeholder="Note Title"
                    className="text-4xl font-extrabold border-none outline-none placeholder:text-slate-300 dark:placeholder:text-muted-foreground w-full bg-transparent pt-8 text-black dark:text-white disabled:cursor-not-allowed disabled:opacity-80 print:hidden"
                />

                <h1 className="hidden print:block text-4xl font-extrabold text-black pt-8 w-full break-words whitespace-pre-wrap">
                    {title}
                </h1>

                {/* Grid wrap trick firmly prevents max-width block blowout, without hiding internal sub-scrolls! */}
                <div className="w-full pb-10 grid grid-cols-1">
                    <EditorContent editor={editor} className="dark:text-zinc-100 placeholder:print:hidden min-w-0 max-w-full" />
                </div>

                {editor && (
                    <BubbleMenu
                        editor={editor}
                        className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-lg p-1 rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Bold (Ctrl+B)"
                        >
                            <Bold className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Italic (Ctrl+I)"
                        >
                            <Italic className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            className={`h-8 w-8 ${editor.isActive('strike') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Strikethrough"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            className={`h-8 w-8 ${editor.isActive('code') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Code"
                        >
                            <Code className="w-4 h-4" />
                        </Button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-zinc-600 mx-1" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            className={`h-8 w-8 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Align Left"
                        >
                            <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            className={`h-8 w-8 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Align Center"
                        >
                            <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            className={`h-8 w-8 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Align Right"
                        >
                            <AlignRight className="w-4 h-4" />
                        </Button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-zinc-600 mx-1" />

                        {/* Heading Levels */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={`h-8 px-2 text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Heading 1"
                        >
                            H1
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={`h-8 px-2 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
                            title="Heading 2"
                        >
                            H2
                        </Button>
                    </BubbleMenu>
                )}

                {/* Custom Context Menu */}
                {contextMenu && contextMenu.isOpen && (
                    <div
                        ref={contextMenuRef}
                        className="fixed z-50 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-lg rounded-md overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <div className="p-1 flex flex-col gap-0.5">
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                Rows
                            </div>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().addRowBefore().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                Add Row Above
                            </button>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().addRowAfter().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
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

                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                Columns
                            </div>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().addColumnBefore().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Add Column Before
                            </button>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().addColumnAfter().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                Add Column After
                            </button>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().deleteColumn().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete Column
                            </button>

                            <div className="h-px bg-slate-200 dark:bg-zinc-700 my-1" />

                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                Cells
                            </div>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().mergeCells().setTextAlign('center').run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                Merge Cells
                            </button>
                            <button
                                onClick={() => {
                                    editor?.chain().focus().splitCell().run()
                                    setContextMenu(null)
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0v12M4 12h16" /></svg>
                                Split Cell
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