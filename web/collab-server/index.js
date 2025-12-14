import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'

// In a real production app, you would add Tiptap extension-database to save to Postgres/Supabase
// For this MVP, we will keep it in-memory or we can add basic persistence later.
// The "Robust" requirement usually means it shouldn't lose data on restart. 
// But first let's get the real-time sync working.

const server = new Server({
    port: process.env.PORT ? Number(process.env.PORT) : 1234,
    extensions: [
        new Logger(),
    ],

    // Example data persistence (Commented out until Supabase is ready)
    /*
    async onLoadDocument(data) {
       // load from supabase
    },
    async onStoreDocument(data) {
       // save to supabase
    },
    */
})

server.listen()
console.log('Scaling up... Hocuspocus is running on port ' + process.env.PORT || 1234)
