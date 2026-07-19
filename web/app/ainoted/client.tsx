"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, PanelLeftClose, PanelLeft, Plus, MessageSquare, Bot, User, LayoutDashboard, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { createClient } from "@/utils/supabase/client"

type Message = {
    role: "user" | "assistant" | "system"
    content: string
}

type AttachedNote = {
    id: string
    title: string
    content: any
    type: string
}

type Workspace = {
    id: string
    name: string
}

export function AINotedClient({ initialUserId, initialWorkspaces }: { initialUserId: string, initialWorkspaces: Workspace[] }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    // Mention state
    const [showMentionMenu, setShowMentionMenu] = useState(false)
    const [mentionQuery, setMentionQuery] = useState("")
    const [mentionResults, setMentionResults] = useState<any[]>([])
    const [attachedNotes, setAttachedNotes] = useState<AttachedNote[]>([])
    const supabase = createClient()
    const user = { id: initialUserId }

    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
    }, [messages])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
    }, [inputValue])

    const extractText = (content: any): string => {
        if (!content) return "";
        try {
            if (typeof content === 'string') return content;
            if (content.type === 'doc' && content.content) {
                const ext = (nodes: any[]): string => {
                    return nodes.reduce((acc, node) => {
                        if (node.text) return acc + node.text + " ";
                        if (node.content) return acc + ext(node.content);
                        return acc;
                    }, "");
                };
                return ext(content.content).trim();
            }
            return JSON.stringify(content);
        } catch (e) {
            return "";
        }
    }

    const searchResources = async (query: string) => {
        if (!user) return

        try {
            const { searchUserNotes } = await import("@/app/actions")
            const data = await searchUserNotes(query)
            if (data) {
                setMentionResults(data.map(d => ({ ...d, type: 'note' })))
            }
        } catch (error) {
            console.error("Error searching notes:", error)
        }
    }

    const attachNote = (note: any) => {
        if (attachedNotes.length >= 10) return;
        if (!attachedNotes.find(n => n.id === note.id)) {
            setAttachedNotes([...attachedNotes, note]);
        }

        const cursor = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = inputValue.substring(0, cursor);
        const textAfterCursor = inputValue.substring(cursor);

        const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\- ]*)$/, '');
        setInputValue(newTextBefore + textAfterCursor);
        setShowMentionMenu(false);

        setTimeout(() => {
            textareaRef.current?.focus();
        }, 10);
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setInputValue(val)

        const cursor = e.target.selectionStart
        const textBeforeCursor = val.substring(0, cursor)

        const match = textBeforeCursor.match(/@([a-zA-Z0-9_\- ]*)$/);

        if (match) {
            setShowMentionMenu(true)
            setMentionQuery(match[1])
            searchResources(match[1])
        } else {
            setShowMentionMenu(false)
        }
    }

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: inputValue.trim() }
        setMessages((prev) => [...prev, userMessage])
        setInputValue("")
        setIsLoading(true)

        // Initialize empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }])

        try {
            const documentContext = attachedNotes.length > 0
                ? attachedNotes.map(n => `--- Document Attached: ${n.title} ---\n${extractText(n.content)}`).join('\n\n')
                : null;

            const workspacesContext = initialWorkspaces.length > 0
                ? `\nAvailable Workspaces for the user:\n` + initialWorkspaces.map(w => `- ID: ${w.id} | Name: ${w.name}`).join('\n')
                : "";

            const strictJSONRule = `\n\nSYSTEM INSTRUCTION FOR NOTE CREATION:\nIf the user asks you to create, draft, or make a new note, you MUST output your suggested note exactly in this JSON format inside a markdown code block labeled \`json-note\`:
\`\`\`json-note
{
  "title": "Title of Note",
  "workspace_id": "Valid Workspace ID string or null",
  "content": "Rich text content here..."
}
\`\`\`\nDo not use this format unless the user explicitly wants you to create a new file/note.${workspacesContext}`;

            const contextText = (documentContext || "") + strictJSONRule;

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    context: contextText
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to fetch response")
            }

            if (!response.body) throw new Error("No response body")

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let done = false

            while (!done) {
                const { value, done: doneReading } = await reader.read()
                done = doneReading
                if (value) {
                    const chunkValue = decoder.decode(value, { stream: true })
                    // Append chunk to the last assistant message
                    setMessages((prev) => {
                        const newMsgs = [...prev]
                        const last = newMsgs[newMsgs.length - 1]
                        if (last.role === "assistant") {
                            last.content += chunkValue
                        }
                        return newMsgs
                    })
                }
            }
        } catch (error) {
            console.error("Chat error:", error)
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleInsertNoteTemplate = () => {
        const template = `Tolong buatkan saya note baru!
- Nama Notes: [Isi Judul Disini]
- Workspace: [Pilih nama workspace atau kosongkan]
- Isi Notes: [Deskripsikan isi note yang kamu inginkan]`
        setInputValue(template)
        setTimeout(() => textareaRef.current?.focus(), 10)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    return (
        <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden font-sans">
            {/* Sidebar */}
            <div
                className={`flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0 opacity-0 pointer-events-none"
                    }`}
            >
                <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-blue-600" />
                        AINoted
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="md:hidden">
                        <PanelLeftClose className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    <Button variant="outline" className="w-full justify-start gap-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950">
                        <Plus className="w-4 h-4" /> New Chat
                    </Button>

                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Menu</p>
                        <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <LayoutDashboard className="w-4 h-4 shrink-0" />
                            Back to Dashboard
                        </Link>
                    </div>

                    <div className="space-y-1 mt-6">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Recent Chats</p>
                        <div className="text-sm text-slate-500 dark:text-slate-400 px-3 py-2 italic">
                            No recent chats yet...
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 relative">
                {/* Header Navbar */}
                <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md absolute top-0 w-full z-10">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <PanelLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 lg:hidden">AINoted</span>
                    </div>
                    {/* Placeholder for future context chips */}
                    <div></div>
                </header>

                {/* Messages Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto w-full pt-16 pb-4 scroll-smooth"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mb-6">
                                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                                Welcome to AINoted
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-8">
                                Brainstorm ideas, get answers, and create new notes instantly. Try asking me something!
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full text-left">
                                {[
                                    "📝 Formulir Note Baru...",
                                    "Help me brainstorm ideas for...",
                                    "Summarize the key points about...",
                                    "Write a code snippet to..."
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (i === 0) handleInsertNoteTemplate();
                                            else setInputValue(suggestion);
                                        }}
                                        className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-300 text-sm text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2"
                                    >
                                        {i === 0 ? <FileText className="w-4 h-4 opacity-50" /> : <MessageSquare className="w-4 h-4 mb-2 opacity-50" />}
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto w-full px-4 space-y-6 pb-20 mt-4">
                            {messages.map((message, index) => (
                                <div key={index} className={`flex gap-4 ${message.role === "assistant" ? "flex-row" : "flex-row-reverse"}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${message.role === "assistant"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                        }`}>
                                        {message.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${message.role === "assistant"
                                        ? "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 prose prose-slate dark:prose-invert prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-white"
                                        : "bg-blue-600 text-white"
                                        }`}>
                                        {message.role === "user" ? (
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        if (!inline && match && match[1] === 'json-note') {
                                                            let noteData: any = {};
                                                            try {
                                                                noteData = JSON.parse(String(children).replace(/\n$/, ''));
                                                            } catch (e) {
                                                                return <pre className="p-4 bg-slate-900 text-white rounded-lg overflow-x-auto text-sm"><code>{children}</code></pre>
                                                            }
                                                            const workspaceName = initialWorkspaces.find(w => w.id === noteData.workspace_id)?.name;
                                                            return (
                                                                <div className="not-prose border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 my-4 font-sans text-slate-800 dark:text-slate-200 shadow-sm">
                                                                    <div className="flex items-center justify-between gap-2 mb-3 border-b border-blue-200 dark:border-blue-800 pb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <FileText className="w-5 h-5 text-blue-500" />
                                                                            <span className="font-semibold text-blue-900 dark:text-blue-100">{noteData.title || "Untitled Note"}</span>
                                                                        </div>
                                                                        {workspaceName && (
                                                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-200/50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                                                                {workspaceName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">{noteData.content}</p>

                                                                    <form action={async () => {
                                                                        const { createNote } = await import("@/app/actions");
                                                                        await createNote({ title: noteData.title, content: noteData.content, workspace_id: noteData.workspace_id });
                                                                    }}>
                                                                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium">
                                                                            <Plus className="w-4 h-4" /> Save as New Note
                                                                        </Button>
                                                                    </form>
                                                                </div>
                                                            )
                                                        }

                                                        return !inline ? (
                                                            <pre className="p-4 bg-slate-900 text-white rounded-lg overflow-x-auto text-sm my-2">
                                                                <code className={className} {...props}>{children}</code>
                                                            </pre>
                                                        ) : (
                                                            <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm text-blue-600 dark:text-blue-400 font-semibold" {...props}>{children}</code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {message.content || '...'}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-blue-600 text-white">
                                        <Bot className="w-5 h-5" />
                                    </div>
                                    <div className="px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex space-x-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-4xl mx-auto relative">
                        {/* Mention Menu */}
                        {showMentionMenu && (
                            <div className="absolute bottom-full mb-2 left-4 z-50 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl w-64 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    Attach Note (Max 10)
                                </div>
                                <div className="max-h-48 overflow-y-auto p-1">
                                    {mentionResults.length === 0 ? (
                                        <div className="p-3 text-sm text-slate-500 italic text-center">No notes found...</div>
                                    ) : (
                                        mentionResults.map(note => (
                                            <button
                                                key={note.id}
                                                onClick={() => attachNote(note)}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                            >
                                                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                                <span className="truncate">{note.title || 'Untitled'}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="relative flex flex-col shadow-sm group border border-slate-300 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-all">

                            {/* Attached Notes Chips */}
                            {attachedNotes.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-3 px-3 pb-1 w-full bg-slate-50/50 dark:bg-slate-900/50">
                                    {attachedNotes.map(note => (
                                        <div key={note.id} className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-md text-xs font-medium shadow-sm transition-all hover:bg-blue-200 dark:hover:bg-blue-800/60">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span className="max-w-[120px] truncate">{note.title || 'Untitled'}</span>
                                            <button
                                                onClick={() => setAttachedNotes(prev => prev.filter(n => n.id !== note.id))}
                                                className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/80 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="relative flex items-end w-full">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={attachedNotes.length >= 10 ? "Max notes reached. Type message..." : "Message AINoted... (Type @ to attach a note)"}
                                    className="w-full max-h-48 py-3 pl-4 pr-12 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-200"
                                    rows={1}
                                />

                                <div className="absolute right-2 bottom-2 font-sans flex items-center gap-2">
                                    <Button
                                        title="Insert Note Template"
                                        onClick={handleInsertNoteTemplate}
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all font-sans"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!inputValue.trim() || isLoading}
                                        size="icon"
                                        className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 transition-all font-sans"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="text-center mt-2 px-2 text-xs text-slate-500">
                            AINoted can make mistakes. Consider verifying important information.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
