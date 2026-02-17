import { useEffect, useState, useRef } from 'react'
import SupabaseProvider from 'y-supabase'
import { createClient } from "@/utils/supabase/client"
import * as Y from 'yjs'

export type Tool = 'hand' | 'selection' | 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line' | 'pencil' | 'text' | 'eraser'

export interface CanvasElement {
    id: string
    type: Tool
    x: number
    y: number
    width: number
    height: number
    strokeColor: string
    strokeWidth?: number
    points?: { x: number; y: number }[]
    text?: string
    fontFamily?: string
    textAlign?: string
}

interface UseWhiteboardStoreProps {
    roomId: string
    initialData?: CanvasElement[]
}

interface UseWhiteboardStoreReturn {
    elements: CanvasElement[]
    setElements: (elements: CanvasElement[]) => void // Note: Local setElements usually not used directly if we sync, but needed for dragging optimization sometimes
    yElementsRef: React.MutableRefObject<Y.Array<CanvasElement> | null>
    providerRef: React.MutableRefObject<SupabaseProvider | null>
    status: string
}

export function useYjsStore({ roomId, initialData }: UseWhiteboardStoreProps): UseWhiteboardStoreReturn {
    const [elements, setElements] = useState<CanvasElement[]>([])
    const [status, setStatus] = useState('disconnected')

    // Yjs Refs
    const yDocRef = useRef<Y.Doc | null>(null)
    const yElementsRef = useRef<Y.Array<CanvasElement> | null>(null)
    const providerRef = useRef<SupabaseProvider | null>(null)

    useEffect(() => {
        if (!roomId) return

        // 1. Initialize Yjs Doc
        const ydoc = new Y.Doc()
        yDocRef.current = ydoc

        const yArray = ydoc.getArray<CanvasElement>("elements")
        yElementsRef.current = yArray

        // 2. Hydrate from Initial Data if Yjs is empty
        // This is important because Hocuspocus might load empty state initially, 
        // OR if it's a new room, we want to start with Supabase data.
        // We only do this check once on mount essentially (via the effect dependency).
        if (initialData && initialData.length > 0) {
            // We only insert if we believe the doc is fresh. 
            // However, Yjs sync is async. We might insert duplicate data if we are not careful.
            // Best practice: Wait for 'synced' to verify emptiness? 
            // Or just trust that if we have initialData, we put it in local state first to show something,
            // and let Yjs catch up.

            // For this implementation, we will follow the CanvasBoard logic:
            // Check immediate length. 
            if (yArray.length === 0) {
                console.log("[useYjsStore] Hydrating Yjs from initialData")
                yArray.insert(0, initialData)
            }
            // Also set local state immediately so user sees it before connection
            setElements(yArray.toArray())
        }

        // 3. Connect Provider
        console.log('[useYjsStore] Connecting to Supabase Realtime')
        const supabase = createClient()

        const provider = new SupabaseProvider(ydoc, supabase, {
            channel: `whiteboard-${roomId}`,
        } as any)
        providerRef.current = provider

        provider.on('status', (event: any) => {
            console.log('[useYjsStore] Status:', event.status)
            setStatus(event.status)
        })

        provider.on('synced', () => {
            console.log('[useYjsStore] Synced. Items:', yArray.length)
            setElements(yArray.toArray())
        })

        // 4. Observe Changes
        const handleObserve = () => {
            setElements(yArray.toArray())
        }
        yArray.observe(handleObserve)

        // Cleanup
        return () => {
            console.log('[useYjsStore] Disconnecting')
            yArray.unobserve(handleObserve)
            provider.destroy()
            ydoc.destroy()
            yDocRef.current = null
            yElementsRef.current = null
            providerRef.current = null
        }
    }, [roomId])

    return {
        elements,
        setElements, // Expose this if components need to optimistically update (mostly for dragging)
        yElementsRef,
        providerRef,
        status
    }
}
