import { Plus, FileText, PenTool, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { WorkspaceOptions } from "@/components/workspace-options"
import { ResourceOptions } from "@/components/resource-options"
import { GuestBanner } from "@/components/guest-banner"

export default async function WorkspaceDashboardPage(props: {
    params: Promise<{ workspaceId: string }>
    searchParams?: Promise<{ q?: string }>
}) {
    const params = await props.params
    const searchParams = await props.searchParams
    const workspaceId = params.workspaceId
    const query = searchParams?.q || ""

    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    // Check if user is anonymous (guest)
    const isGuest = user?.is_anonymous ?? false;

    if (!user) {
        redirect("/login")
    }

    // Fetch Workspace Details
    const { data: currentWorkspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single()

    if (!currentWorkspace) {
        return <div>Workspace not found</div>
    }

    // Fetch Notes
    let notesQuery = supabase
        .from("notes")
        .select("*, workspaces(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

    if (query) {
        notesQuery = notesQuery.ilike("title", `%${query}%`)
    }

    const { data: notes } = await notesQuery

    // Helper to extract text from TipTap JSON
    type TiptapContent = {
        type?: string
        content?: TiptapContent[]
        text?: string
    }

    const getPreviewText = (content: unknown): string => {
        if (!content) return "";
        try {
            if (typeof content === 'string') return content;
            const node = content as TiptapContent;
            if (node.type === 'doc' && Array.isArray(node.content)) {
                const extract = (nodes: TiptapContent[]): string => {
                    return nodes.reduce((acc, n) => {
                        if (n.text) return acc + n.text + " ";
                        if (n.content && Array.isArray(n.content)) return acc + extract(n.content);
                        return acc;
                    }, "");
                };
                return extract(node.content).trim();
            }
            return "";
        } catch {
            return "";
        }
    }

    // Fetch Whiteboards
    let whiteboardsQuery = supabase
        .from("whiteboards")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

    if (query) {
        whiteboardsQuery = whiteboardsQuery.ilike("title", `%${query}%`)
    }

    const { data: whiteboards } = await whiteboardsQuery

    // Fetch All Workspaces
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })

    return (
        <div className="p-6 md:p-12 space-y-10 bg-linear-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Guest Banner */}
            {isGuest && <GuestBanner />}

            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {currentWorkspace.name}
                    </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    Workspace Dashboard - manage your notes and whiteboards in one place
                </p>
            </div>

            {/* Header & Options */}
            <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm dark:text-slate-400">Your workspace resources</p>
                <WorkspaceOptions workspaceId={workspaceId} workspaceName={currentWorkspace.name} />
            </div>

            {/* Quick Actions Section */}
            <section>
                <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <CreateResourceModal type="note" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-40 border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-700">
                                <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl group-hover:shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                                    <FileText className="text-white w-7 h-7" />
                                </div>
                                <span className="text-base font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Create Note</span>
                            </Card>
                        </button>
                    </CreateResourceModal>

                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-40 border-2 border-green-200 dark:border-green-900/50 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-green-400 dark:hover:border-green-700">
                                <div className="w-14 h-14 bg-linear-to-br from-green-500 to-green-700 rounded-2xl group-hover:shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                                    <PenTool className="text-white w-7 h-7" />
                                </div>
                                <span className="text-base font-semibold text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200">Create Whiteboard</span>
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Notes</h2>
                </div>

                <div className="flex flex-col gap-3">
                    {/* New Note Button */}
                    <CreateResourceModal type="note" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full text-left">
                            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-dashed border-2 hover:border-blue-400 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer flex items-center gap-4 group">
                                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                                    <Plus className="text-white w-6 h-6" />
                                </div>
                                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Create New Note</span>
                            </Card>
                        </button>
                    </CreateResourceModal>

                    {/* Notes List */}
                    {notes?.map((note) => (
                        <div key={note.id} className="relative group/wrapper">
                            <Link href={`/notes/${note.id}`}>
                                <Card className="p-4 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between text-right gap-4 group/card hover:border-blue-300 dark:hover:border-blue-800">
                                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8 text-left">
                                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/card:text-blue-700 dark:group-hover/card:text-blue-300">
                                            {note.title || "Untitled"}
                                        </h3>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start justify-start gap-1 shrink-0">
                                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                            {currentWorkspace.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(note.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <ResourceOptions id={note.id} title={note.title || "Untitled"} type="note" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* My Whiteboard Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <PenTool className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Whiteboards</h2>
                </div>

                <div className="flex flex-col gap-3">
                    {/* New Whiteboard Button */}
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full text-left">
                            <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-dashed border-2 hover:border-green-400 dark:hover:border-green-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer flex items-center gap-4 group">
                                <div className="w-10 h-10 bg-linear-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                                    <Plus className="text-white w-6 h-6" />
                                </div>
                                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Start New Whiteboard</span>
                            </Card>
                        </button>
                    </CreateResourceModal>

                    {/* Whiteboards List */}
                    {whiteboards?.map((board) => (
                        <div key={board.id} className="relative group/wrapper">
                            <Link href={`/whiteboard/${board.id}`}>
                                <Card className="p-4 hover:shadow-md hover:bg-green-50/50 dark:hover:bg-green-950/30 transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between text-right gap-4 group/card hover:border-green-300 dark:hover:border-green-800">
                                    <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-600 dark:text-green-400 shrink-0">
                                        <PenTool className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8 text-left">
                                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/card:text-green-700 dark:group-hover/card:text-green-300">
                                            {board.title || "Untitled"}
                                        </h3>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start justify-start gap-1 shrink-0">
                                        <span className="text-xs text-slate-400">
                                            {new Date(board.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <ResourceOptions id={board.id} title={board.title || "Untitled"} type="whiteboard" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
