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
        <div className="p-6 md:p-12 space-y-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Guest Banner */}
            {isGuest && <GuestBanner />}

            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl group-hover:shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                                    <FileText className="text-white w-7 h-7" />
                                </div>
                                <span className="text-base font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Create Note</span>
                            </Card>
                        </button>
                    </CreateResourceModal>

                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-40 border-2 border-green-200 dark:border-green-900/50 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-green-400 dark:hover:border-green-700">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl group-hover:shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Notes List & New Note Button Combined */}
                    {[
                        ...(notes || []).map((note) => {
                            const previewText = getPreviewText(note.content);
                            const words = previewText.split(/\s+/).filter(w => w.length > 0);
                            const truncatedPreview = words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");

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
                                                    {currentWorkspace.name}
                                                </span>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                    <ResourceOptions id={note.id} title={note.title || "Untitled"} type="note" />
                                </div>
                            )
                        }),
                        <div key="new-note-btn" className="relative group block h-56">
                            <CreateResourceModal type="note" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
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
                    ]}
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Whiteboards List */}
                    {whiteboards?.map((board) => (
                        <div key={board.id} className="relative group block">
                            <Link href={`/whiteboard/${board.id}`}>
                                <Card className="h-52 hover:shadow-xl transition-all duration-300 hover:bg-green-50/50 dark:hover:bg-green-950/30 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-2 group/card hover:border-green-300 dark:hover:border-green-800">
                                    <div className="p-4 flex flex-col h-full">
                                        <div className="flex-1 flex items-center justify-center">
                                            {board.content?.preview ? (
                                                board.content.preview.startsWith('data:image') ? (
                                                    <img
                                                        src={board.content.preview}
                                                        alt="Whiteboard preview"
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                                                        dangerouslySetInnerHTML={{ __html: board.content.preview }}
                                                    />
                                                )
                                            ) : (
                                                <svg viewBox="0 0 100 60" className="w-full h-48 stroke-slate-300 dark:stroke-slate-700 group-hover/card:stroke-green-500 transition-colors duration-300 stroke-2 fill-none">
                                                    <path d="M10,10 Q30,50 50,30 T90,30" />
                                                    <rect x="20" y="20" width="10" height="10" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                                <div className="text-center">
                                    <span className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-300 transition-colors">{board.title || "Untitled"}</span>
                                </div>
                            </Link>
                            <ResourceOptions id={board.id} title={board.title || "Untitled"} type="whiteboard" />
                        </div>
                    ))}

                    {/* New Whiteboard Button */}
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} defaultWorkspaceId={workspaceId} isGuest={isGuest}>
                        <button className="w-full h-full group">
                            <Card className="h-52 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center hover:shadow-xl transition-all duration-300 cursor-pointer mb-2 border-dashed border-2 hover:border-green-400 dark:hover:border-green-700">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl group-hover:shadow-xl shadow-green-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                                        <Plus className="text-white w-7 h-7" />
                                    </div>
                                </div>
                            </Card>
                            <div className="text-center">
                                <span className="text-base font-semibold text-slate-600 dark:text-slate-300 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">New Whiteboard</span>
                            </div>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
