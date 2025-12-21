
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'

const WhiteboardComponent = (props: any) => {
    const id = props.node.attrs.id || 'new'
    const url = `/whiteboard/${id}`

    return (
        <NodeViewWrapper className="whiteboard-embed my-4">
            <Link href={url} target="_blank" className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors group text-decoration-none">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <LayoutDashboard className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">Interactive Whiteboard</span>
                    <span className="text-sm text-slate-500 dark:text-zinc-400">Click to open and collaborate</span>
                </div>
            </Link>
        </NodeViewWrapper>
    )
}

export const WhiteboardExtension = Node.create({
    name: 'whiteboard',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            id: {
                default: null,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'whiteboard-embed',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['whiteboard-embed', mergeAttributes(HTMLAttributes)]
    },

    addNodeView() {
        return ReactNodeViewRenderer(WhiteboardComponent)
    },
})
