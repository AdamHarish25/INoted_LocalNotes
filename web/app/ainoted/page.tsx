"use client"

import React, { useState, useRef, useEffect } from "react"
import { Send, PanelLeftClose, PanelLeft, Plus, MessageSquare, Bot, User, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Message = {
    role: "user" | "assistant" | "system"
    content: string
}

export default function AINotedPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)
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

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: inputValue.trim() }
        setMessages((prev) => [...prev, userMessage])
        setInputValue("")
        setIsLoading(true)

        // Initialize empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }])

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    context: null // We'll use this later for context injection
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
                                    "Help me brainstorm ideas for...",
                                    "Summarize the key points about...",
                                    "Create an outline for a presentation...",
                                    "Write a code snippet to..."
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInputValue(suggestion)}
                                        className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-300 text-sm text-slate-600 dark:text-slate-300 transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4 mb-2 opacity-50" />
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
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                        <div className="relative flex items-end shadow-sm group border border-slate-300 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-all">

                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message AINoted... (Type @ to reference a note)"
                                className="w-full max-h-48 py-3 pl-4 pr-12 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-200"
                                rows={1}
                            />

                            <div className="absolute right-2 bottom-2 font-sans flex items-center">
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
                        <div className="text-center mt-2 px-2 text-xs text-slate-500">
                            AINoted can make mistakes. Consider verifying important information.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
