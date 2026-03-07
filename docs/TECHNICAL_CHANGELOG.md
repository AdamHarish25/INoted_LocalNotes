# Technical Implementation and Changelog

## [2026-02-18] Editor Realtime Collaboration & UX Enhancements

This update introduces distinct improvements to the document editor, focusing on stability, realtime collaboration reliability, and user experience.

### 1. Realtime Collaboration Infrastructure (Yjs + Supabase)
We have implemented a robust realtime syncing engine using **Y.js** (CRDT) over **Supabase Realtime** channels. This replaces the previous naive "last-write-wins" approach with a conflict-free resolution system.

#### Key Components:
*   **`SupabaseProvider` (`web/lib/y-supabase.ts`)**:
    *   A custom provider class that acts as the bridge between Y.js documents and Supabase Realtime Channels.
    *   **Broadcast**: Propagates document updates (`update` events) to all connected clients instantly using `supabase.channel().send()`.
    *   **Awareness**: Manages ephemeral state (cursor positions, user selections, names, and colors) using the Y.js Awareness protocol.
    *   **Persistence**: Automatically saves the merged Y.js state back to the Supabase `notes` table (debounced) to ensure long-term persistence.

#### Logic & Safety Mechanisms:
*   **Leader Election for Hydration**:
    *   **Problem**: When multiple users open an empty document simultaneously, they might all try to "hydrate" it with the initial content, causing duplication (e.g., "Hello Hello Hello").
    *   **Solution**: Implemented a leader election algorithm based on Client IDs. Only the client with the lowest sorting Client ID (or the first to arrive) is allowed to write the initial content.
*   **Graceful Connection Handling**: Added retry logic and connection status indicators in the UI.

### 2. Collaboration UX: Cursors & Identity
We enhanced the visual cues for collaboration to make the experience feel "premium" and standard, moving away from default blocky placeholders.

#### Cursor Styling (`web/app/globals.css`)
*   **Thin Caret**: Changed the remote cursor from a solid block to a 2px thin vertical line, mimicking standard text editors.
*   **Blinking Animation**: Added a CSS `@keyframe` animation to make remote cursors blink, indicating liveness.
*   **Tooltips**: Added floating labels above the cursor showing the collaborator's name.
*   **Non-intrusive**: Set `pointer-events: none` to ensure remote cursors do not block clicks or selection.

#### User Identity (`web/components/editor/tiptap-editor.tsx`)
*   **Dynamic Identity**: The `TiptapEditor` now accepts `userName` and `userColor` props.
*   **Color Generation**: Implemented a stable hash function (`stringToColor`) to generate the same color for a given username consistently, avoiding random rainbow colors on reload.
*   **Integration**: The `NotePage` (`web/app/notes/[id]/page.tsx`) now retrieves the `user_metadata.full_name` or `email` from the Supabase session and passes it to the editor, ensuring users are correctly identified to their peers.

### 3. File Structure Changes
*   **Modified**: `web/components/editor/tiptap-editor.tsx` - Main logic integration.
*   **Modified**: `web/app/notes/[id]/page.tsx` - Data fetching and prop passing.
*   **Modified**: `web/app/globals.css` - Global styles for cursor classes.
*   **Created**: `web/lib/y-supabase.ts` - Core realtime logic.

## [2026-03-07] Editor History & Mistral AI SDK Bug Fixes

This update addresses several bugs regarding Mistral AI connection failures and Yjs collaboration history tracking conflicts in the editor.

### 1. Mistral AI "Built-in Connectors" Stream Failure
*   **Problem**: Mistral SDK's `agents.stream` endpoint unexpectedly crashes with a `400 Bad Request` ("Built-in connectors are not yet supported") if the configured Agent has advanced tools (like web search) enabled on Mistral's platform, completely breaking the in-app AI chat connection.
*   **Solution**: Implemented a graceful fallback mechanism in `web/app/api/chat/route.ts`. If the Agent stream fails with this error, the API automatically catches it and falls back to using the standard text-generation model (`client.chat.stream` with `mistral-large-latest`), effectively preserving the assistant's functionality without breaking the UX.

### 2. Tiptap / Yjs Realtime Collaboration Undo/Redo Conflict
*   **Problem**: Tiptap's console threw a warning `[tiptap warn]: "@tiptap/extension-collaboration" comes with its own history support and is not compatible with "@tiptap/extension-undo-redo"` and the Undo/Redo functionality experienced odd behaviors.
*   **Solution**: The `undo`, `redo`, and `history` modules embedded inside Tiptap's default `StarterKit` extension were explicitly disabled (`undo: false, redo: false, history: false`). This correctly delegates all History management directly to the Yjs `Collaboration` extension which provides robust real-time multi-player Undo/Redo.

### 3. Editor UI: Google Docs-Style Undo/Redo Header
*   **Enhancement**: Migrated the `Undo` and `Redo` buttons out of the floating bubble menu to the main top header bar of the screen (alongside the title and back button). This perfectly mimics standard editors like Google Docs, keeping the formatting bubble menu clean while ensuring history commands are always accessible.
