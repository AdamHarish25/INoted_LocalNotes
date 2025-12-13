import Whiteboard from "@/components/whiteboard/tldraw-canvas"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"

export default async function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: whiteboard } = await supabase
        .from("whiteboards")
        .select("content, is_public")
        .eq("id", id)
        .single()

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <div className="flex-1 w-full h-full bg-white relative">
                <Whiteboard roomId={id} initialContent={whiteboard?.content} isPublic={whiteboard?.is_public} />
            </div>
        </div>
    )
}
