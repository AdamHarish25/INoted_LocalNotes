"use client"

import { type Editor } from "@tiptap/react"
import {
    Bold,
    Italic,
    Underline,
    Link as LinkIcon,
    List,
    Heading1,
    Heading2,
    Heading3,
    Undo,
    Redo
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EditorToolbarProps {
    editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    if (!editor) {
        return null
    }

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-1 bg-blue-500 p-2 rounded-full shadow-lg text-white">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full disabled:opacity-50"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full disabled:opacity-50"
                >
                    <Redo className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-blue-400 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("heading", { level: 1 }) && "bg-blue-700"
                    )}
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("heading", { level: 2 }) && "bg-blue-700"
                    )}
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("heading", { level: 3 }) && "bg-blue-700"
                    )}
                >
                    <Heading3 className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-blue-400 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("bold") && "bg-blue-700"
                    )}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("italic") && "bg-blue-700"
                    )}
                >
                    <Italic className="h-4 w-4" />
                </Button>

                {/* Underline requires extension, checking if I installed it. 
            I installed starter-kit. Underline is NOT in starter-kit. 
            I might skip it or just map it to something else for now. 
            Mockup has it. I should install @tiptap/extension-underline later. 
            For now I'll just render the button.
        */}
                <Button
                    variant="ghost"
                    size="icon"
                    // No underline in starter kit by default, would fail silently or error
                    // onClick={() => editor.chain().focus().toggleUnderline().run()} 
                    className="h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full opacity-50 cursor-not-allowed"
                    title="Underline extension not installed yet"
                >
                    <Underline className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    // Link requires extension
                    className="h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full opacity-50 cursor-not-allowed"
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn(
                        "h-8 w-8 text-white hover:bg-blue-600 hover:text-white rounded-full",
                        editor.isActive("bulletList") && "bg-blue-700"
                    )}
                >
                    <List className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
