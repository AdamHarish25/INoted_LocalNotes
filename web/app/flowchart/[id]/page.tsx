import FlowchartBoard from "@/components/flowchart/flowchart-board"
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function FlowchartPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    const { data: flowchart } = await supabase
        .from("flowcharts")
        .select("content, is_public, allow_public_editing, owner_id")
        .eq("id", id)
        .single()

    if (!flowchart) {
        notFound()
    }

    const isOwner = user?.id === flowchart?.owner_id
    const isAllowedPublicEdit = flowchart?.is_public && (flowchart as any)?.allow_public_editing
    const isReadOnly = !isOwner && !isAllowedPublicEdit

    return (
        <div className="relative w-full h-screen overflow-hidden bg-white">
            <FlowchartBoard
                roomId={id}
                initialData={flowchart?.content || []}
                initialIsPublic={flowchart?.is_public}
                initialAllowPublicEditing={(flowchart as any)?.allow_public_editing}
                isReadOnly={isReadOnly}
                currentUser={user}
            />
        </div>
    )
}
