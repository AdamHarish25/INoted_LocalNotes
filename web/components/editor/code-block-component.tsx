import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import React, { useState } from 'react'
import { Play, Terminal, X, Copy, Check } from 'lucide-react'

export default ({ node: { attrs: { language: defaultLanguage }, textContent }, updateAttributes, extension, node }: any) => {

    const languages = extension.options.lowlight.listLanguages()
    const [output, setOutput] = useState<string | null>(null)
    const [isError, setIsError] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    // Helper to capture console logs
    const runCode = () => {
        const code = node.textContent
        if (!code) return

        let logs: string[] = []
        const originalLog = console.log
        const originalError = console.error

        try {
            // Mock console.log
            console.log = (...args) => {
                logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
            }
            console.error = (...args) => {
                logs.push("ERROR: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
            }

            // Execute
            // We wrap in an async function to allow await if valid JS
            // Note: This is client-side execution using new Function. 
            // It has access to window context which might be dangerous in production but suitable for this "Developer Note" feature.
            const run = new Function(code)
            const result = run()

            // If result is not undefined, show it too
            if (result !== undefined) {
                logs.push("Return: " + (typeof result === 'object' ? JSON.stringify(result) : String(result)))
            }

            setOutput(logs.join('\n') || "Code executed successfully (no output)")
            setIsError(false)

        } catch (err: any) {
            setOutput(err.toString())
            setIsError(true)
        } finally {
            console.log = originalLog
            console.error = originalError
        }
    }

    const copyCode = () => {
        navigator.clipboard.writeText(node.textContent)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <NodeViewWrapper className="code-block-wrapper relative my-6 rounded-lg overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800 bg-[#1e1e1e] group">
            {/* macOS Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#252526] border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" /> {/* Red */}
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" /> {/* Yellow */}
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" /> {/* Green */}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 hover:text-zinc-300 font-mono hidden md:block">{defaultLanguage || 'auto'}</span>

                    {/* Copy Button */}
                    <button
                        onClick={copyCode}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                        title="Copy code"
                    >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Run Button (Only for JS/TS) */}
                    {(defaultLanguage === 'js' || defaultLanguage === 'javascript' || defaultLanguage === 'typescript' || defaultLanguage === 'ts' || !defaultLanguage) && (
                        <button
                            onClick={runCode}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-700/20 hover:bg-green-700/40 text-green-400 hover:text-green-300 border border-green-900/50 transition-all text-xs font-medium"
                        >
                            <Play className="w-3 h-3 fill-current" />
                            Run
                        </button>
                    )}

                    <select
                        contentEditable={false}
                        defaultValue={defaultLanguage}
                        onChange={event => updateAttributes({ language: event.target.value })}
                        className="bg-transparent text-xs text-slate-400 focus:outline-none cursor-pointer hover:text-white transition-colors w-[15px] opacity-0 absolute right-10"
                        title="Change language"
                    >
                        <option value="null">auto</option>
                        <option disabled>—</option>
                        {languages && languages.map((lang: string, index: number) => (
                            <option key={index} value={lang}>
                                {lang}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Code Content */}
            <div className="relative">
                <pre className="bg-[#1e1e1e]! m-0! p-4! overflow-x-auto text-sm font-mono leading-relaxed text-[#d4d4d4] custom-scrollbar">
                    {/* @ts-ignore */}
                    <NodeViewContent as="code" />
                </pre>
            </div>

            {/* Output Console */}
            {output && (
                <div className="border-t border-[#333] bg-[#0d0d0d]">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-[#1a1a1a] border-b border-[#333]">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-3 h-3 text-zinc-500" />
                            <span className="text-xs text-zinc-500 font-medium">Console Output</span>
                        </div>
                        <button onClick={() => setOutput(null)} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className={`p-3 font-mono text-xs overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap ${isError ? 'text-red-400' : 'text-zinc-300'}`}>
                        {output}
                    </div>
                </div>
            )}
        </NodeViewWrapper>
    )
}

