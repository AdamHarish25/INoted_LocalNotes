import CanvasBoard from "@/components/whiteboard/canvas-board"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params
    const supabase = await createClient()

    const { data: whiteboard } = await supabase
        .from("whiteboards")
        .select("title")
        .eq("id", id)
        .single()

    const title = whiteboard?.title || "Untitled Whiteboard"
    const description = "View and collaborate on this whiteboard on INoted."
    return {
        title: `${title} - INoted`,
        description,
        openGraph: {
            title: `${title} - INoted`,
            description,
            type: "article",
        },
        twitter: {
            card: "summary",
            title: `${title} - INoted`,
            description,
        }
    }
}

export default async function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    const { data: whiteboard } = await supabase
        .from("whiteboards")
        .select("title, content, is_public, allow_public_editing, owner_id")
        .eq("id", id)
        .single()

    if (!whiteboard) {
        notFound()
    }

    const isOwner = user?.id === whiteboard?.owner_id
    const isAllowedPublicEdit = whiteboard?.is_public && (whiteboard as any)?.allow_public_editing
    const isReadOnly = !isOwner && !isAllowedPublicEdit

    return (
        <div className="relative w-full h-screen overflow-hidden bg-white">
            <CanvasBoard
                roomId={id}
                initialData={whiteboard?.content || []}
                initialIsPublic={whiteboard?.is_public}
                initialAllowPublicEditing={(whiteboard as any)?.allow_public_editing}
                currentUser={user}
                isReadOnly={isReadOnly}
            />
        </div>
    )
}
