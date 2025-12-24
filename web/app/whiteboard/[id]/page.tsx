import CanvasBoard from "@/components/whiteboard/canvas-board"
import { Button } from "@/components/ui/button"
import { Share, Cloud } from "lucide-react"

import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
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
            <CanvasBoard roomId={id} initialData={whiteboard?.content || []} initialIsPublic={whiteboard?.is_public} />
        </div>
    )
}
