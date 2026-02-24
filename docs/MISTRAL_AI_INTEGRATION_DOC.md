# Mistral AI Integration Report

## Overview
This document outlines the complete integration architecture, components, and environment configuration for the new **Mistral AI Custom Agent Assistant** inside the INoted platform.

The goal was to provide an intelligent assistant capable of understanding user context across collaborative components (Notes, Flowcharts, Whiteboards) using local storage bridging and the `@mistralai/mistralai` package.

## 1. Dependencies Installed
The following crucial dependencies were added to `web/package.json`:
- **`@mistralai/mistralai`**: Official Node.js SDK to stream Mistral AI chat completions and agents.
- **`react-markdown`**: To safely render markdown dynamically in the React/Next.js frontend.
- **`remark-gfm`**: A plugin for `react-markdown` to support GitHub-flavored markdown (like data Tables).
- **`rehype-raw`**: A plugin to parse raw HTML injected by the LLM (like `<br>` inside tables) safely into the DOM.

## 2. Environment Variables Architecture
To properly route the Chat UI to the newly created Custom Agent (built in the Mistral AI Studio), two environment variables were set up (locally in `.env.local` and also injected in the Netlify Dashboard):
- `MISTRAL_API_KEY`: Secret string required to authenticate.
- `MISTRAL_AGENT_ID`: E.g., `ag_019c8d103e47724088c39cff71c4aa4b` which targets the customized "Inoted" system instructions.

## 3. Server-Side Execution (`app/api/chat/route.ts`)
Created a new Edge/Serverless Next.js API Route specializing in streamed AI output.
- Checks if the `MISTRAL_API_KEY` is present.
- Detects if a `MISTRAL_AGENT_ID` is present. If it is, it uses the specific Custom Agent route (`client.agents.stream`). Otherwise, it defaults back to `mistral-large-latest` using `client.chat.stream`.
- Streams continuous chunks of text directly back to the `ChatAssistant` frontend using standard `ReadableStream` patterns via Server-sent Events (SSE).

## 4. Floating UI Component (`components/chat-assistant.tsx`)
Created a persistent Floating AI widget mounted at the bottom-right corner.
- **Persistent Visibility**: It persists across routing natively via `ClientLayout`.
- **Dynamic Context Grabbing**: Reads the active context directly from `window.localStorage.getItem('inoted_ai_context')` immediately when the user sends a message. This makes it instantly aware of what the user is typing in Notes or drafting in Flowcharts.
- **Stream Decoding**: Reads the streaming chunks using `TextDecoder` and continuously updates state for smooth typing animations.
- **Markdown & Code Format Parsing**: Fully supports rendering standard Markdown text, lists, fully structured Tables, bold text, and raw HTML line-breaks via `react-markdown`.
- **Light & Dark Mode**: Adapts dynamically using standard Tailwind Zinc/Slate utility classes so chat text and input visibility remain pristine.

## 5. UI Layout Integration (`components/client-layout.tsx`)
Injected `<ChatAssistant />` conditionally inside the global application layout.
- Added variable logic to correctly hide the Chat Assistant on the pure Marketing Page (`/`) and the the dedicated Login Page (`/login`), providing the chatbot only strictly inside the user dashboard areas (`!shouldHideSidebar`).

## 6. Realtime Context Sync Framework (The "Bridge")
We connected the active editing canvases directly to localStorage to pass "brain" knowledge to the AI Assistant.
- **Inside `components/editor/tiptap-editor.tsx`**: Updated the `onUpdate` lifecycle. Every time the user types inside the Tiptap canvas, the raw textual output is saved to `inoted_ai_context`.
- **Inside `components/flowchart/flowchart-board.tsx`**: Added similar logic to flatten canvas Nodes into a readable string to allow Mistral to comprehend the sequence of the flowchart natively.

## 7. Supplemental Improvements
- Addressed bug related to `slash-command.tsx` by implementing `activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` so keyboard arrow navigation continuously auto-scrolls the active list option into view gracefully.
