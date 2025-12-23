import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import React from 'react'

export default ({ node: { attrs: { language: defaultLanguage } }, updateAttributes, extension }: any) => {

    const languages = extension.options.lowlight.listLanguages()

    return (
        <NodeViewWrapper className="code-block-wrapper relative my-4 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-zinc-800 bg-[#1e1e1e]">
            {/* macOS Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" /> {/* Red */}
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" /> {/* Yellow */}
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" /> {/* Green */}
                </div>

                {/* Language Selector (Optional, but useful) */}
                <select
                    contentEditable={false}
                    defaultValue={defaultLanguage}
                    onChange={event => updateAttributes({ language: event.target.value })}
                    className="bg-transparent text-xs text-slate-400 focus:outline-none cursor-pointer hover:text-white transition-colors"
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

            {/* Code Content */}
            <div className="relative">
                <pre className="bg-[#1e1e1e]! m-0! p-4! overflow-x-auto text-sm font-mono leading-relaxed text-[#d4d4d4]">
                    {/* @ts-ignore */}
                    <NodeViewContent as="code" />
                </pre>
            </div>
        </NodeViewWrapper>
    )
}
