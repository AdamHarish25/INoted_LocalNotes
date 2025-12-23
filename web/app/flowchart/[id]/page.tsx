import FlowchartBoard from "@/components/flowchart/flowchart-board"
import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"

export default async function FlowchartPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

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
