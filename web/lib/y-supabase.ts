import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

export default class SupabaseProvider extends EventEmitter {
    public doc: Y.Doc
    public awareness: Awareness
    private supabase: SupabaseClient
    private channel: RealtimeChannel | null = null
    private _synced: boolean = false
    private readonly id: string
    private isOnline: boolean = false

    constructor(doc: Y.Doc, supabase: SupabaseClient, { channel }: { channel: string, id?: string, tableName?: string, columnName?: string }) {
        super()
        this.doc = doc
        this.supabase = supabase
        this.id = channel
        this.awareness = new Awareness(doc)

        // Using specific config to ensure we don't receive our own messages
        this.channel = this.supabase.channel(channel, {
            config: {
                broadcast: { self: false }
            }
        })

        // Listen to local Yjs updates and broadcast them
        this.doc.on('update', this.onUpdate.bind(this))

        // Awareness updates (cursors)
        if (this.awareness) {
            this.awareness.on('update', this.onAwarenessUpdate.bind(this))
        }

        // Setup Sync
        this.channel
            .on('broadcast', { event: 'message' }, ({ payload }) => {
                this.onMessage(payload)
            })
            .on('presence', { event: 'sync' }, () => {
                // We mainly rely on 'awareness' broadcast messages
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // When a new user joins, we send our state so they can sync up
                // Check if it's not us (though 'join' usually implies remote or all?)
                // Safety: just send Step 1.
                if (this.isOnline) {
                    this.sendSyncStep1()
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.isOnline = true
                    this.emit('status', { status: 'connected' })
                    this.synced = true

                    // Start Sync Protocol
                    this.sendSyncStep1()

                    // Track Presence
                    this.channel?.track({
                        uploaded_at: new Date().toISOString(),
                        clientId: this.doc.clientID
                    })
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this.isOnline = false
                    this.emit('status', { status: 'disconnected' })
                    this.synced = false
                }
            })
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

    private async sendSafe(payload: any) {
        if (!this.isOnline || !this.channel) return
        try {
            await this.channel.send({
                type: 'broadcast',
                event: 'message',
                payload: payload
            })
        } catch (err) {
            console.error("SupabaseProvider: Error sending message", err)
        }
    }

    private sendSyncStep1() {
        const stateVector = Y.encodeStateVector(this.doc)
        this.sendSafe({
            type: 'sync-step-1',
            payload: Array.from(stateVector)
        })
    }

    private sendSyncStep2(targetStateVector: Uint8Array) {
        const update = Y.encodeStateAsUpdate(this.doc, targetStateVector)
        this.sendSafe({
            type: 'sync-step-2',
            payload: Array.from(update)
        })
    }

    // Handle incoming broadcast messages (remote updates)
    private onMessage(message: any) {
        if (!message || !message.type || !message.payload) return

        try {
            const data = new Uint8Array(message.payload)
            switch (message.type) {
                case 'sync-step-1':
                    this.sendSyncStep2(data)
                    break
                case 'sync-step-2':
                case 'update':
                    Y.applyUpdate(this.doc, data, this)
                    break
                case 'awareness':
                    applyAwarenessUpdate(this.awareness, data, this)
                    break
            }
        } catch (err) {
            console.error("SupabaseProvider: Error processing message", err)
        }
    }

    // Handle local document updates -> Broadcast
    private onUpdate(update: Uint8Array, origin: any) {
        if (origin !== this && this.isOnline) {
            this.sendSafe({
                type: 'update',
                payload: Array.from(update),
            })
        }
    }

    private onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
        if (origin !== this && this.isOnline) {
            const changedClients = added.concat(updated).concat(removed)
            const awarenessUpdate = encodeAwarenessUpdate(this.awareness, changedClients)
            this.sendSafe({
                type: 'awareness',
                payload: Array.from(awarenessUpdate)
            })
        }
    }

    public destroy() {
        this.doc.off('update', this.onUpdate.bind(this))
        this.awareness.off('update', this.onAwarenessUpdate.bind(this))
        this.isOnline = false
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
