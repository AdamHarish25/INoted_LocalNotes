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
        <div className="p-6 md:p-12 space-y-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
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

            {/* My Whiteboard Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <PenTool className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Whiteboards</h2>
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
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []} isGuest={isGuest}>
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
        </div >
    )
}
