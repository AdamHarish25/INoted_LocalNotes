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

### 4. Table Context Menu Viewport Overlap
*   **Problem**: When right-clicking a table near the bottom of the screen, the custom Context Menu would render downwards, causing it to overlap and go off-screen, making the bottom actions (like "Merge Cells", "Delete Table") unclickable.
*   **Solution**: Dynamically calculate the popup `style` dimensions against `window.innerHeight`. If the cursor's Y position is within `450px` of the bottom of the viewport, the Context Menu swaps to `bottom: window.innerHeight - contextMenu.y`. This forces the menu to render *upwards* (reversed appearance) safely into view instead of bleeding off the screen.

## [2026-07-05] PDF Export Enhancements & Formatting Fixes

This update significantly improves the Tiptap-to-PDF export pipeline (`handleExportPDF` in `tiptap-editor.tsx`), addressing layout accuracy, nested structures, and font encoding limitations in jsPDF.

### 1. Accurate Nested List Rendering
*   **Recursive Depth Tracking**: The PDF generator now recursively tracks the `depth` of nested lists (Bullet, Ordered, and Task lists). Each level of nesting applies an additional `20pt` indentation to perfectly mimic the Tiptap editor's visual hierarchy.
*   **Multi-line Text Alignment**: Implemented a `textOffset` constraint so that text wrapping onto multiple lines aligns with the text block itself, rather than wrapping underneath the bullet symbol.

### 2. Bullet Point Encoding Fix (jsPDF)
*   **Problem**: jsPDF's built-in lightweight fonts (like Helvetica with WinAnsiEncoding) fail to render Unicode bullet characters (e.g., `•`, `○`, `■`), resulting in garbled text (`%E`) in the output PDF.
*   **Solution**: Swapped Unicode bullet symbols to standard ASCII characters based on nesting depth (`-` for level 1, `o` for level 2, `*` for level 3), guaranteeing cross-platform font compatibility without requiring heavy external `.ttf` font injections.

### 3. Ordered List Numbering Continuity
*   **Problem**: When an ordered list in Tiptap is visually separated by a standard paragraph, the engine splits it into separate `orderedList` nodes. The naive export script treated these as entirely new lists, incorrectly rendering the prefix as `1.` repeatedly.
*   **Solution**: Added logic to dynamically read the `node.attrs.start` property injected by Tiptap. Ordered lists now intelligently resume numbering (e.g., `4.`, `5.`) even when dispersed across different JSON nodes.

### 4. Flawless Text Extraction
*   **Robust Recursion**: Replaced naive text mapping with a highly robust `extractText()` recursive function. This guarantees that deep block structures (like blockquotes) and inline formatting marks (bold, italic, links) inside lists or paragraphs will never result in silently dropped or lost text during PDF conversion.
