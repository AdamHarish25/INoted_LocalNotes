import { Plus, PenTool, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { ResourceOptions } from "@/components/resource-options"
import { GuestBanner } from "@/components/guest-banner"

export default async function WhiteboardDashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams
    const query = searchParams?.q || ""

    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    // Check if user is anonymous (guest)
    const isGuest = user?.is_anonymous ?? false;

    if (!user) {
        redirect("/login")
    }

    // Fetch Whiteboards
    let whiteboardsQuery = supabase
        .from("whiteboards")
        .select("*")
        .eq("owner_id", user!.id) // SECURITY FIX
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
        <div className="p-6 md:p-12 space-y-10 bg-linear-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-linear-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Whiteboards
                    </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    Sketch, brainstorm, and visualize ideas on an infinite canvas
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
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} isGuest={isGuest}>
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

            {/* My Whiteboard Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <PenTool className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Whiteboards</h2>
                </div>

                <div className="flex flex-col gap-3">
                    {/* New Whiteboard Button */}
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} isGuest={isGuest}>
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
        </div >
    )
}
