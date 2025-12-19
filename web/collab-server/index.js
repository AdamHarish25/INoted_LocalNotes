import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { createClient } from '@supabase/supabase-js'
import * as Y from 'yjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from parent directory .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase credentials are missing.')
    console.error('Please set the following environment variables in your deployment (Railway/Vercel/etc):')
    console.error(' - NEXT_PUBLIC_SUPABASE_URL')
    console.error(' - NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const server = new Server({
    port: process.env.PORT ? Number(process.env.PORT) : 1234,
    extensions: [
        new Logger(),
    ],

    async onRequest(data) {
        const { request, response } = data
        // console.log(`[onRequest] Handling HTTP request: ${request.method} ${request.url}`)
        response.writeHead(200, { 'Content-Type': 'text/plain' })
        response.end('OK')
    },

    async onLoadDocument(data) {
        console.log(`[onLoadDocument] Loading ${data.documentName}`)
        try {
            const { data: record, error } = await supabase
                .from('whiteboards')
                .select('content')
                .eq('id', data.documentName)
                .single()

            if (error) {
                console.error("[onLoadDocument] Supabase Error:", error.message)
                return new Y.Doc()
            }

            console.log(`[onLoadDocument] Fetched record. Content type: ${typeof record.content}`)
            // console.log(`[onLoadDocument] Content:`, JSON.stringify(record.content).slice(0, 100))

            const doc = new Y.Doc()

            if (record && record.content) {
                let content = record.content
                if (typeof content === 'string') {
                    try {
                        content = JSON.parse(content)
                    } catch (e) {
                        console.warn("[onLoadDocument] Failed to parse content string")
                    }
                }

                if (Array.isArray(content)) {
                    console.log(`[onLoadDocument] Populating Y.Doc with ${content.length} elements`)
                    const yArray = doc.getArray('elements')
                    doc.transact(() => {
                        yArray.insert(0, content)
                    })
                } else {
                    console.warn("[onLoadDocument] Content is not an array:", content)
                }
            }

            return doc

        } catch (e) {
            console.error("[onLoadDocument] PROMISE ERROR:", e)
            return new Y.Doc()
        }
    },

    async onConnect(data) {
        console.log(`[onConnect] New connection to ${data.documentName}`)
    },

    async onChange(data) {
        console.log(`[onChange] Document ${data.documentName} updated.`)
    },

    async onDisconnect(data) {
        console.log(`[onDisconnect] Connection lost from ${data.documentName}`)
    },

    async onStoreDocument(data) {
        try {
            const elements = data.document.getArray('elements').toArray()
            console.log(`[onStoreDocument] Saving ${data.documentName}. Elements: ${elements.length}`)

            if (elements.length === 0) {
                console.log("[onStoreDocument] Document is empty. Proceeding to save empty state.")
            }

            // We pass the raw array. Supabase client handles serialization for JSON/JSONB columns.
            // If the column is TEXT, Supabase might stringify it. 
            // To be safe and explicit, keeping it as object allows Supabase to handle it best if mapped to JSONB.
            // However, to match previous logic and ensure we don't break textual columns, let's try direct update first.

            // Using upsert would be better but requires all non-nullable columns. 
            // We sticking to update but checking count.

            const { error, count } = await supabase
                .from('whiteboards')
                .update({ content: elements }) // Pass raw object/array
                .eq('id', data.documentName)
                .select('id', { count: 'exact' })

            if (error) {
                console.error("[onStoreDocument] Supabase Update Error:", error.message, error.details)
            } else if (count === 0) {
                console.warn(`[onStoreDocument] WARNING: No rows updated for ID ${data.documentName}.`)
                console.warn(`[onStoreDocument] Possible causes:`)
                console.warn(`1. The whiteboard ID does not exist in the database.`)
                console.warn(`2. RLS policies prevent update (check if SUPABASE_SERVICE_ROLE_KEY is used).`)
            } else {
                console.log(`[onStoreDocument] SUCCESS. Saved to DB. Elements: ${elements.length}`)
            }
        } catch (e) {
            console.error("[onStoreDocument] CRASH:", e)
        }
    },
})

server.listen()
console.log('Hocuspocus running on port ' + (process.env.PORT || 1234))
