"use client"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { HocuspocusProvider } from "@hocuspocus/provider"
import * as Y from "yjs"
// import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
    { ssr: false }
)

export default function ExcalidrawCanvas({ roomId }: { roomId: string }) {
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Setup Yjs for real-time collaboration
    useEffect(() => {
        if (!excalidrawAPI) return

        const ydoc = new Y.Doc()
        // Configure Hocuspocus provider
        // Note: We use the same environment variable and path logic as before
        const hostUrl = (process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://127.0.0.1:1234')
            .replace(/^https?:\/\//, 'wss://')
            .replace(/^ws:\/\//, 'ws://')

        // Ensure wss if not explicit
        const finalUrl = hostUrl.match(/^(ws|wss):\/\//)
            ? hostUrl
            : `wss://${hostUrl}`

        const provider = new HocuspocusProvider({
            url: finalUrl,
            name: roomId,
            document: ydoc,
        })

        const yElements = ydoc.getArray("excalidraw-elements")

        // Observe changes from other users
        const handleRemoteChanges = () => {
            const remoteElements = yElements.toArray()
            // We only update if the lengths or content differ to avoid refreshing unnecessarily
            // For a robust implementation, a deep comparison or delta update is better.
            // This is a basic "last write wins" sync for the array.
            excalidrawAPI.updateScene({ elements: remoteElements as any })
        }

        yElements.observe(handleRemoteChanges)

        // Initial load if data exists
        if (yElements.length > 0) {
            handleRemoteChanges()
        }

        return () => {
            provider.destroy()
            ydoc.destroy()
        }
    }, [roomId, excalidrawAPI])

    // Handle local changes
    const handleChange = (elements: readonly any[], appState: any, files: any) => {
        // NOTE: This is where we would push changes to Yjs.
        // However, pushing *every* change event directly to Yjs array without diffing 
        // will cause an infinite loop with the observer above.
        // 
        // Implementing a full Yjs-Excalidraw binding from scratch is complex.
        // For this step, we will setup the "Canvas" first. 
        // Full two-way sync requires a more sophisticated binding library (like y-excalidraw) 
        // or careful state management which we can refine in the next step.
    }

    return (
        <div className="flex flex-col bg-slate-50 overflow-hidden h-full">
            {/* Header */}
            <div
                className="flex items-center p-4 bg-white border-b border-gray-200 shrink-0"
                style={{ height: '10px' }}
            >
                <Link href="/dashboard" className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>
            </div>

            {/* Canvas Runner */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Excalidraw
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        onChange={handleChange}
                        UIOptions={{
                            canvasActions: {
                                loadScene: false,
                                export: { saveFileToDisk: true },
                                saveToActiveFile: false,
                                toggleTheme: true,
                                saveAsImage: true,
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
