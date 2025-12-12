import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { Editor, Range, Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Text,
    Code
} from 'lucide-react'

// 1. Definition of commands
interface CommandItemProps {
    title: string
    description: string
    icon: React.ElementType
    command: ({ editor, range }: { editor: Editor; range: Range }) => void
}

const getSuggestionItems = ({ query }: { query: string }) => {
    return [
        {
            title: 'Heading 1',
            description: 'Big section heading',
            icon: Heading1,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading',
            icon: Heading2,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading',
            icon: Heading3,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bullet list',
            icon: List,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run()
            },
        },
        {
            title: 'Ordered List',
            description: 'Create a numbered list',
            icon: ListOrdered,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run()
            },
        },
        {
            title: 'Task List',
            description: 'Track tasks with a todo list',
            icon: CheckSquare,
            command: ({ editor, range }: { editor: Editor; range: Range }) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run()
            },
        },
    ].filter((item) => {
        if (typeof query === 'string' && query.length > 0) {
            return item.title.toLowerCase().includes(query.toLowerCase())
        }
        return true
    })
}

// 2. The Menu Component
const CommandList = React.forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    useEffect(() => {
        setSelectedIndex(0)
    }, [props.items])

    useLayoutEffect(() => {
        const navigationHandler = (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
                return true
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length)
                return true
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex)
                return true
            }
            return false
        }
        // We need to bind this to the tiptap editor keydown, 
        // but ReactRenderer handles passing methods.
        // However, the suggestion config handles keydown via `props` 
        // passed to this component if we attach it to the ref? No.
        // The `suggestion` plugin calls `onKeyDown` which we defined in `renderItems`.
        // We expose it via `useImperativeHandle` usually.
    }, [props.items, selectedIndex])

    // Expose methods to parent via ref for Tiptap to control
    React.useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
                return true
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length)
                return true
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex)
                return true
            }
            return false
        },
    }))

    return (
        <div className="z-50 min-w-[300px] h-auto rounded-md border bg-popover p-1 shadow-md animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col overflow-hidden rounded-sm bg-white p-1">
                {props.items.length ? (
                    props.items.map((item: CommandItemProps, index: number) => (
                        <button
                            key={index}
                            className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none w-full text-left transition-colors ${index === selectedIndex ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-100/50'
                                }`}
                            onClick={() => selectItem(index)}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white">
                                <item.icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-900">{item.title}</span>
                                <span className="text-xs text-slate-400">{item.description}</span>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="px-2 py-4 text-center text-sm text-slate-500">
                        No results
                    </div>
                )}
            </div>
        </div>
    )
})

CommandList.displayName = 'CommandList'

// 3. The Extension
export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range })
                },
            },
        }
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ]
    },
})

export const suggestion = {
    items: getSuggestionItems,
    render: () => {
        let component: ReactRenderer | null = null
        let popup: any | null = null

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(CommandList, {
                    props,
                    editor: props.editor,
                })

                if (!props.clientRect) {
                    return
                }

                popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                })
            },

            onUpdate(props: any) {
                component?.updateProps(props)

                if (!props.clientRect) {
                    return
                }

                popup?.[0].setProps({
                    getReferenceClientRect: props.clientRect,
                })
            },

            onKeyDown(props: any) {
                if (props.event.key === 'Escape') {
                    popup?.[0].hide()
                    return true
                }

                return (component?.ref as any)?.onKeyDown(props)
            },

            onExit() {
                popup?.[0].destroy()
                component?.destroy()
            },
        }
    },
}
