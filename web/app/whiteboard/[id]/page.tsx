import CanvasBoard from "@/components/whiteboard/canvas-board"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    const { data: whiteboard } = await supabase
        .from("whiteboards")
        .select("content, is_public")
        .eq("id", id)
        .single()

    if (!whiteboard) {
        notFound()
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-white">
            <CanvasBoard roomId={id} initialData={whiteboard?.content || []} initialIsPublic={whiteboard?.is_public} currentUser={user} />
        </div>
    )
}
