import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    let supabase = await createClient()
    let { data: { user } } = await supabase.auth.getUser()

    // Fallback to Auth.js session if Supabase auth is missing
    if (!user) {
        const { auth } = await import("@/auth")
        const session = await auth()
        if (session?.user) {
            const { createAdminClient } = await import("@/utils/supabase/server")
            supabase = await createAdminClient()
            user = {
                id: session.user.id as string,
                email: session.user.email,
                is_anonymous: false,
                aud: "authenticated",
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                role: "authenticated"
            } as any
        }
    }

    const { data: note } = await supabase
        .from("notes")
        .select(`
            title,
            content,
            is_public,
            workspace:workspaces(name),
            owner_id
        `)
        .eq("id", id)
        .single()

    if (!note) {
        notFound()
    }


    const isOwner = user?.id === note?.owner_id
    const isReadOnly = !isOwner

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
                    isReadOnly={isReadOnly}
                />
            </div>
        </div>
    )
}
