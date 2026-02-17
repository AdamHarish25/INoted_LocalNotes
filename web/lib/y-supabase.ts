import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

export default class SupabaseProvider extends EventEmitter {
    public doc: Y.Doc
    public awareness: Awareness
    private supabase: SupabaseClient
    private channel: RealtimeChannel | null = null
    private _synced: boolean = false
    private readonly id: string
    private readonly eventName: string = 'message'

    constructor(doc: Y.Doc, supabase: SupabaseClient, { channel, id, tableName, columnName }: { channel: string, id?: string, tableName?: string, columnName?: string }) {
        super()
        this.doc = doc
        this.supabase = supabase
        this.id = channel
        this.awareness = new Awareness(doc)

        this.channel = this.supabase.channel(channel)

        // Setup Sync
        this.channel
            .on('broadcast', { event: 'message' }, ({ payload }) => {
                this.onMessage(new Uint8Array(payload))
            })
            .on('presence', { event: 'sync' }, () => {
                const state = this.channel?.presenceState()
                if (state) {
                    // Merge presence state into Yjs awareness
                    // Note: Simplistic mapping for now. Real implementations map robustly.
                    // For now, we rely on broadcast for document updates mostly.
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.emit('status', { status: 'connected' })
                    this.synced = true
                } else {
                    this.emit('status', { status: 'disconnected' })
                    this.synced = false
                }
            })

        // Listen to local Yjs updates and broadcast them
        this.doc.on('update', this.onUpdate.bind(this))

        // Awareness updates (cursors)
        this.awareness.on('update', this.onAwarenessUpdate.bind(this))
    }

    get synced() {
        return this._synced
    }

    set synced(state) {
        if (this._synced !== state) {
            this._synced = state
            this.emit('synced', state)
            this.emit('sync', state)
        }
    }

    // Handle incoming broadcast messages (remote updates)
    private onMessage(payload: Uint8Array) {
        Y.applyUpdate(this.doc, payload, this)
    }

    // Handle local document updates -> Broadcast
    private onUpdate(update: Uint8Array, origin: any) {
        if (origin !== this) {
            // Broadcast the update vector
            // Note: Supabase Broadcast bas limits on payload/rate. 
            // For heavy production usage, batching or throttling might be needed.
            this.channel?.send({
                type: 'broadcast',
                event: 'message',
                payload: Array.from(update),
            })
        }
    }

    private onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
        // Sync awareness changes via Presence or Broadcast
        // For simplicity in this demo, we can broadcast awareness arrays if needed,
        // or use channel.track() for presence.
        // 
        // Implementing full awareness via Supabase Presence:
        // const localState = this.awareness.getLocalState()
        // this.channel?.track(localState)
    }

    public destroy() {
        this.doc.off('update', this.onUpdate.bind(this))
        this.awareness.off('update', this.onAwarenessUpdate.bind(this))
        if (this.channel) {
            this.supabase.removeChannel(this.channel)
            this.channel = null
        }
        this.removeAllListeners()
    }

    public disconnect() {
        this.destroy()
    }
}
