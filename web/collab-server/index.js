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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
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
        // Load the document from Supabase
        // We assume the 'id' in the URL is the whiteboard ID
        try {
            const { data: record, error } = await supabase
                .from('whiteboards')
                .select('content')
                .eq('id', data.documentName)
                .single()

            if (error || !record || !record.content) {
                // If no document found or empty, return default
                if (error) console.error("Load Error:", error.message)
                return new Y.Doc()
            }

            // Convert Base64 string back to Uint8Array
            const binary = Uint8Array.from(Buffer.from(record.content, 'base64'))

            // Return the document instance with loaded data
            // Hocuspocus expects the binary update or Y.Doc? 
            // Actually onLoadDocument should return Y.Doc or Promise<Y.Doc> typically, 
            // OR return the update itself. Hocuspocus documentation says return the Y.Doc.
            // But we can also just apply the update to the doc passed in?
            // "If you return a Y.Doc, Hocuspocus will use that."
            const doc = new Y.Doc()
            Y.applyUpdate(doc, binary)
            return doc

        } catch (e) {
            console.error("Failed to load document:", e)
            return new Y.Doc()
        }
    },

    async onStoreDocument(data) {
        // Save the document to Supabase
        try {
            // Encode the full state as a binary update
            const update = Y.encodeStateAsUpdate(data.document)
            // Convert to Base64 for storage in text/json column
            const base64 = Buffer.from(update).toString('base64')

            const { error } = await supabase
                .from('whiteboards')
                .update({ content: base64 })
                .eq('id', data.documentName)

            if (error) {
                console.error("Failed to save document:", error.message)
            } else {
                // console.log(`Saved document ${data.documentName}`)
            }
        } catch (e) {
            console.error("Save Error:", e)
        }
    },
})

server.listen()
// console.log('Hocuspocus running on port ' + (process.env.PORT || 1234))
