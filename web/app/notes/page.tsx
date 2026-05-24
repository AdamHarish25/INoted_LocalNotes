import { Plus, FileText, Sparkles, Zap } from "lucide-react"
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
        redirect("/login?next=/notes")
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

    // Fetch Workspaces
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user!.id) // SECURITY FIX
        .order("created_at", { ascending: false })

    return (
        <div className="p-6 md:p-12 space-y-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Notes
                    </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    Capture your thoughts, ideas, and notes in a beautiful, intuitive interface
                </p>
            </div>

            {/* Guest Banner */}
            {isGuest && <GuestBanner />}

            {/* Quick Actions Section */}
            <section>
                <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Start
                </h2>
                <div className="grid grid-cols-1 gap-6 mb-10">
                    <CreateResourceModal type="note" workspaces={workspaces || []} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-40 border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-700">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl group-hover:shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                                    <FileText className="text-white w-7 h-7" />
                                </div>
                                <span className="text-base font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Create Note</span>
                            </Card>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>

            {/* Search Bar */}
            <div className="flex justify-center mb-10">
                <div className="w-full max-w-2xl">
                    <SearchInput />
                </div>
            </div>

            {/* My Notes Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Notes</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Notes List */}
                    {notes?.map((note) => {
                        const previewText = getPreviewText(note.content);
                        const words = previewText.split(/\s+/).filter(w => w.length > 0);
                        const truncatedPreview = words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");
                        const workspaceName = note.workspaces?.name || "Personal";

                        return (
                            <div key={note.id} className="relative group">
                                <Link href={`/notes/${note.id}`}>
                                    <Card className="h-56 py-4 hover:shadow-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col group/card hover:border-blue-300 dark:hover:border-blue-800">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg font-semibold group-hover/card:text-blue-700 dark:group-hover/card:text-blue-300 text-slate-800 dark:text-slate-200 truncate mr-6">{note.title || "Untitled"}</CardTitle>
                                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                                {new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-hidden p-4 pt-0">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 text-left line-clamp-3">
                                                {truncatedPreview || "Click to start writing..."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-2 pb-4 flex justify-start px-4">
                                            <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs px-3 py-1 rounded-full font-medium border border-yellow-200 dark:border-yellow-800/50">
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
                            <Card className="h-56 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 group transition-all duration-300 flex items-center justify-center hover:shadow-xl cursor-pointer group border-dashed border-2 hover:border-blue-400 dark:hover:border-blue-700">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl group-hover:shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                                        <Plus className="text-white w-7 h-7" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">New Note</span>
                                </div>
                            </Card>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
