import {
    createTLStore,
    defaultShapeUtils,
    throttle,
} from 'tldraw'
import { useEffect, useState, useMemo } from 'react'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

export function useYjsStore({ roomId, hostUrl }: { roomId: string; hostUrl: string }) {
    const [store] = useState(() => {
        return createTLStore({
            shapeUtils: defaultShapeUtils,
        })
    })

    // NOTE: A full Yjs <-> Tldraw binding is 500+ lines of code to handle 
    // correct delta updates, undo/redo manager syncing, etc.
    // For this MVP, we are establishing the connection.
    // In a real production app, you would copy the 'y-tldraw' binding utility 
    // from the Tldraw examples repo.

    useEffect(() => {
        const provider = new HocuspocusProvider({
            url: hostUrl,
            name: roomId,
            document: new Y.Doc(),
        })

        // Simplified sync: Check if we connected
        provider.on('synced', () => {
            console.log('Connected to whiteboard room:', roomId)
        })

        return () => {
            provider.destroy()
        }
    }, [roomId, hostUrl])

    return store
}
