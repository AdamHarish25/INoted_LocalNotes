"use client"

import { Tldraw } from "tldraw"
import "tldraw/tldraw.css"
import { useYjsStore } from "@/lib/useYjsStore"

import { useState } from "react"

// Imports for Header UI
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

export default function Whiteboard({ roomId = 'example-whiteboard', initialContent }: { roomId?: string, initialContent?: any }) {
    const [saveStatus, setSaveStatus] = useState("Saved")
    const store = useYjsStore({
        roomId: roomId,
        hostUrl: 'ws://127.0.0.1:1234',
    })



    const handleMount = (editor: any) => {
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
                const { updateWhiteboard } = await import("@/app/actions")

                // Generate Preview
                let preview = ""
                try {
                    const shapeIds = editor.getCurrentPageShapeIds()
                    if (shapeIds.size > 0) {
                        const { getSvgAsImage } = await import("tldraw")
                        // It seems getSvgAsImage takes (editor, options) in this version
                        // We will capture a fixed thumbnail size of the current view
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

                // Wrap snapshot and preview
                const contentPayload = {
                    snapshot,
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
        <div className="flex flex-col absolute inset-0 bg-white text-slate-900">
            {/* Integrated Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white z-10 w-full">
                <div className="flex items-center gap-4">
                    <div className="md:hidden">
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-1 text-slate-300 text-xs">
                        <Cloud className="w-3 h-3" />
                        <span>{saveStatus === 'Saved' ? 'Saved to Cloud' : saveStatus}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Center title if needed */}
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
                        <span className="mr-2">Share</span>
                        <Share className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden">
                <Tldraw store={store} onMount={handleMount} />
            </div>
        </div>
    )
}
