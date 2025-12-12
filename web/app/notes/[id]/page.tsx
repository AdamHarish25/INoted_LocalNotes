import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: note } = await supabase
        .from("notes")
        .select(`
            title,
            content,
            is_public,
            workspace:workspaces(name)
        `)
        .eq("id", id)
        .single()

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Editor Area with Integrated Header */}
            <div className="flex-1 bg-white overflow-y-auto">
                <TiptapEditor
                    noteId={id}
                    initialContent={note?.content}
                    initialTitle={note?.title || "Untitled Note"}
                    initialIsPublic={note?.is_public}
                    initialWorkspace={(note as any)?.workspace?.name}
                />
            </div>
        </div>
    )
}
