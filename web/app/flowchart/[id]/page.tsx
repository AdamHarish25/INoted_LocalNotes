import FlowchartBoard from "@/components/flowchart/flowchart-board"
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function FlowchartPage({ params }: { params: Promise<{ id: string }> }) {
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

    const { data: flowchart } = await supabase
        .from("flowcharts")
        .select("content")
        .eq("id", id)
        .single()

    // We allow access even if not in DB? No, usually we need the record.
    // But for 'new' flowcharts, we might want to handle it. 
    // For now, fail if not found, consistent with whiteboard page.
    if (!flowchart) {
        // notFound() 
        // actually for testing lets allow empty
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-white">
            <FlowchartBoard roomId={id} initialData={flowchart?.content || []} />
        </div>
    )
}
