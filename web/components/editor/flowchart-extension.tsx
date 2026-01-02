
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import Link from 'next/link'
import { Network, ExternalLink } from 'lucide-react'

const FlowchartComponent = (props: any) => {
    const id = props.node.attrs.id || 'new'
    const preview = props.node.attrs.preview
    const title = props.node.attrs.title || 'Untitled Flowchart'
    const url = `/flowchart/${id}`

    return (
        <NodeViewWrapper className="flowchart-embed my-6">
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">

                {/* Header / Title Bar */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-linear-to-b from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-white">
                        <Network className="w-4 h-4 drop-shadow-md" />
                        <span className="text-sm font-medium drop-shadow-md truncate">{title}</span>
                    </div>
                    <Link href={url} target="_blank" className="p-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-md text-white transition-colors" title="Open in Fullscreen">
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </div>

                {/* Preview Image or Placeholder */}
                <Link href={url} target="_blank" className="relative aspect-video bg-slate-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Flowchart Preview"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-zinc-500">
                            <Network className="w-12 h-12 opacity-50" />
                            <span className="text-sm">Click to edit flowchart</span>
                        </div>
                    )}
                </Link>

                {/* Footer caption (mostly for context if preview fails) */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Interactive Flowchart</span>
                    <span className="text-xs text-slate-400">ID: {id.substring(0, 8)}...</span>
                </div>
            </div>
        </NodeViewWrapper>
    )
}

export const FlowchartExtension = Node.create({
    name: 'flowchart',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            id: {
                default: null,
            },
            preview: {
                default: null,
            },
            title: {
                default: null
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'flowchart-embed',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['flowchart-embed', mergeAttributes(HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(FlowchartComponent)
    },
})
