import { Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { ResourceOptions } from "@/components/resource-options"
import { GuestBanner } from "@/components/guest-banner"

export default async function NoteDashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams
    const query = searchParams?.q || ""

    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    // Check if user is anonymous (guest)
    const isGuest = user?.is_anonymous ?? false;

    if (!user) {
        redirect("/login")
    }

    // Fetch Notes
    let notesQuery = supabase
        .from("notes")
        .select("*, workspaces(name)")
        .eq("owner_id", user!.id) // SECURITY FIX
        .order("created_at", { ascending: false })

    if (query) {
        notesQuery = notesQuery.ilike("title", `%${query}%`)
    }

    const { data: notes } = await notesQuery

    // ... (helper function remains implicitly here if I don't touch it, but since I am replacing a block, I should be careful)
    // Wait, replacing a huge block might be risky if I miss the helper.
    // Let's do targeted replacements.

    // Actually, I'll just replace the query definition blocks.

    // This tool call is for notes query


    // Helper to extract text from TipTap JSON
    const getPreviewText = (content: any): string => {
        if (!content) return "";
        try {
            if (typeof content === 'string') return content;
            if (content.type === 'doc' && content.content) {
                const extract = (nodes: any[]): string => {
                    return nodes.reduce((acc, node) => {
                        if (node.text) return acc + node.text + " ";
                        if (node.content) return acc + extract(node.content);
                        return acc;
                    }, "");
                };
                return extract(content.content).trim();
            }
            return "";
        } catch (e) {
            return "";
        }
    }

    // Fetch Whiteboards
    let whiteboardsQuery = supabase
        .from("whiteboards")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })

    if (query) {
        whiteboardsQuery = whiteboardsQuery.ilike("title", `%${query}%`)
    }

    const { data: whiteboards } = await whiteboardsQuery

    // Fetch Workspaces
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user!.id) // SECURITY FIX
        .order("created_at", { ascending: false })

    return (
        <div className="p-8 space-y-8 bg-muted/30 dark:bg-background min-h-screen">
            {/* Guest Banner */}
            {isGuest && <GuestBanner />}

            {/* Search Bar */}
            <div className="flex justify-center mb-8">
                <SearchInput />
            </div>

            {/* My Notes Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1">
                        <svg
                            className="w-5 h-5 text-slate-400 dark:text-zinc-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-400 dark:text-zinc-500">My Notes</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Notes List */}
                    {notes?.map((note) => {
                        const previewText = getPreviewText(note.content);
                        const words = previewText.split(/\s+/).filter(w => w.length > 0);
                        const truncatedPreview = words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
                        const workspaceName = note.workspaces?.name || "Personal";

                        return (
                            <div key={note.id} className="relative group">
                                <Link href={`/notes/${note.id}`}>
                                    <Card className="h-48 py-4 hover:shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col group/card">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 text-slate-700 dark:text-zinc-200 truncate mr-6">{note.title || "Untitled"}</CardTitle>
                                            <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                                                {new Date(note.created_at).toLocaleDateString()}
                                            </p>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-hidden flex items-center justify-center p-4">
                                            <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium text-center break-all italic">
                                                {truncatedPreview || "No content"}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-2 pb-4 flex justify-end">
                                            <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 text-[10px] px-3 py-1 rounded-full font-medium shadow-sm truncate max-w-[100px] border border-yellow-200 dark:border-yellow-900/50">
                                                {workspaceName}
                                            </span>
                                        </CardFooter>
                                    </Card>
                                </Link>
                                <ResourceOptions id={note.id} title={note.title || "Untitled"} type="note" />
                            </div>
                        )
                    })}

                    {/* New Note Button */}
                    <CreateResourceModal type="note" workspaces={workspaces || []} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-48 border-slate-200 dark:border-zinc-800 bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-900 group transition-all duration-200 flex items-center justify-center hover:shadow-md cursor-pointer group border-dashed">
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full group-hover:shadow-md shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform mb-2">
                                        <Plus className="text-white w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">New Note</span>
                                </div>
                            </Card>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
