"use client"

import { Tldraw, getSvgAsImage, DefaultStylePanel } from "tldraw"
import "tldraw/tldraw.css"
import { useYjsStore } from "@/lib/useYjsStore"
import { updateWhiteboard } from "@/app/actions"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Share, Cloud, Check, Maximize2, Minimize2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateWhiteboardSharing } from "@/app/actions"

export default function Whiteboard({ roomId = 'example-whiteboard', initialContent, isPublic }: { roomId?: string, initialContent?: any, isPublic?: boolean }) {
    const [editor, setEditor] = useState<any>(null)
    const [saveStatus, setSaveStatus] = useState("Saved")
    const [isCopied, setIsCopied] = useState(false)
    const [isPublicState, setIsPublicState] = useState(isPublic || false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const store = useYjsStore({
        roomId: roomId ?? 'example-whiteboard',
        hostUrl: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://127.0.0.1:1234',
    })

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleTogglePublic = async () => {
        setIsUpdating(true)
        const newState = !isPublicState

        try {
            const result = await updateWhiteboardSharing(roomId, newState)
            if (result.success) {
                setIsPublicState(newState)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsUpdating(false)
        }
    }

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
        // Trigger resize event for Tldraw to adjust
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 100)
    }

    // Handle Integrated Zoom (Ctrl +/- and Ctrl+Wheel)
    useEffect(() => {
        if (!editor) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '-' || e.key === '+')) {
                e.preventDefault()
                if (e.key === '=' || e.key === '+') {
                    editor.zoomIn()
                } else {
                    editor.zoomOut()
                }
            }
        }

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                // Tldraw might handle this natively if focused, but we enforce it here
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        // Note: For wheel, we might need { passive: false } to preventDefault
        window.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('wheel', handleWheel)
        }
    }, [editor])

    const handleMount = (editorInstance: any) => {
        setEditor(editorInstance)
        const editor = editorInstance

        // HYDRATION LOGIC:
        // Try to load initial snapshot if available.
        // We do this check carefully. If the Yjs store is empty, we load the snapshot.
        if (initialContent && Object.keys(initialContent).length > 0) {
            try {
                // Check if content is wrapped (new format) or direct snapshot (legacy)
                const snapshotToLoad = initialContent.snapshot || initialContent

                const snapshot = editor.store.getStoreSnapshot()

                // Tldraw default store has 'store' key.
                const currentStore = snapshot.store || {}
                const hasShapes = Object.values(currentStore).some((record: any) => record.typeName === 'shape')

                // Force load if empty
                if (!hasShapes) {
                    editor.store.loadStoreSnapshot(snapshotToLoad)
                }
            } catch (e) {
                console.error("Failed to load snapshot", e)
            }
        }

        let timeoutId: NodeJS.Timeout

        const save = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(async () => {
                // Generate Preview
                let preview = ""
                try {
                    const shapeIds = editor.getCurrentPageShapeIds()
                    if (shapeIds.size > 0) {
                        const blob = await getSvgAsImage(editor, {
                            type: 'png',
                            quality: 0.8,
                            width: 300,
                            height: 200
                        })

                        if (blob) {
                            const reader = new FileReader()
                            preview = await new Promise((resolve) => {
                                reader.onloadend = () => resolve(reader.result as string)
                                reader.readAsDataURL(blob)
                            })
                        }
                    } else {
                        // No shapes to generate preview for.
                    }
                } catch (e) {
                    console.error("Error generating preview", e)
                }

                // Use getStoreSnapshot as per user feedback
                const snapshot = editor.store.getStoreSnapshot()

                // Ensure snapshot is a plain object to avoid "opaque temporary reference" errors
                // This strips out any proxies or non-serializable internal Tldraw structures
                const plainSnapshot = JSON.parse(JSON.stringify(snapshot))

                // Wrap snapshot and preview
                const contentPayload = {
                    snapshot: plainSnapshot,
                    preview
                }

                const result = await updateWhiteboard(roomId, contentPayload)
                if (result.success) {
                    setSaveStatus("Saved")
                } else {
                    setSaveStatus("Error")
                }
            }, 2000)
        }

        editor.store.listen(() => {
            setSaveStatus("Saving...")
            save()
        })
    }

    return (
        <div className={`flex flex-col bg-white text-slate-900 ${isFullscreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'absolute inset-0'}`}>
            {/* Integrated Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white z-10 w-full">
                <div className="flex items-center gap-4">
                    <div className="md:hidden">
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-slate-600"
                            onClick={toggleFullscreen}
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        <div className={`flex items-center gap-1 text-slate-700 text-xs ${saveStatus === "Saved" ? "animate-none" : "animate-pulse"}`}>
                            <Cloud className="w-3 h-3" />
                            <span>{saveStatus === 'Saved' ? 'Saved to Cloud' : saveStatus}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Share Modal */}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-slate-600 min-w-[100px]"
                            >
                                <span className="mr-2">Share</span>
                                <Share className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Share Whiteboard</DialogTitle>
                                <DialogDescription>
                                    Manage sharing settings for this whiteboard.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center space-x-2 py-4">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Link
                                    </Label>
                                    <Input
                                        id="link"
                                        defaultValue={typeof window !== 'undefined' ? window.location.href : ""}
                                        readOnly
                                    />
                                </div>
                                <Button size="sm" onClick={handleShare} className="px-3">
                                    {isCopied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <span className="sr-only">Copy</span>
                                    )}
                                    {isCopied ? "Copied" : "Copy"}
                                </Button>
                            </div>

                            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                                <div className="flex flex-col space-y-0.5">
                                    <Label className="text-base font-semibold">Public Access</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {isPublicState
                                            ? "Anyone with the link can view this whiteboard."
                                            : "Only you can access this whiteboard."}
                                    </p>
                                </div>
                                <button
                                    onClick={handleTogglePublic}
                                    disabled={isUpdating}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${isPublicState ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <span
                                        className={`${isPublicState ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                            </div>

                            <DialogFooter className="sm:justify-start">

                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden">
                <Tldraw
                    store={store}
                    onMount={handleMount}
                    components={{
                        StylePanel: () => (
                            <div className="absolute top-[60px] left-[12px] z-[200] pointer-events-auto">
                                <DefaultStylePanel />
                            </div>
                        )
                    }}
                />
            </div>
        </div>
    )
}

