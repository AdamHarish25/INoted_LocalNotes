"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "./ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export function ChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "assistant", content: string }[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: "user" as const, content: input.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Get content from localStorage or session if stored by editors
            const contextContent = typeof window !== 'undefined' ? window.localStorage.getItem('inoted_ai_context') || '' : '';

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    context: contextContent
                }),
            });

            if (!response.ok) throw new Error("Failed to connect to API");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            let done = false;
            while (!done && reader) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    setMessages((prev) => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].content += chunk;
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting to the server. Have you added your MISTRAL_API_KEY?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <div className="w-[320px] md:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-blue-600 dark:text-zinc-100">AI Noted</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                                <Bot className="w-12 h-12" />
                                <p className="text-sm px-6">Hi! I am Mistral AI. I can review your notes, flowcharts, or whiteboards. Just ask!</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100'}`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap' : 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-tl-sm overflow-x-auto overflow-y-hidden'}`}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <div className="flex relative items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask me anything..."
                                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full px-4 py-2 pr-12 text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="absolute right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
