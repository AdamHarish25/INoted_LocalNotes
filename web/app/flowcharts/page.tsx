import { Plus, Workflow, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { ResourceOptions } from "@/components/resource-options"
import { GuestBanner } from "@/components/guest-banner"

export default async function FlowchartDashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams
    const query = searchParams?.q || ""

    const { getSupabaseUser } = await import("@/utils/supabase/get-user")
    let { supabase, user } = await getSupabaseUser()

    // Check if user is anonymous (guest)
    const isGuest = user?.is_anonymous ?? false;

    if (!user) {
        redirect("/login")
    }

    // Fetch Flowcharts
    let flowchartsQuery = supabase
        .from("flowcharts")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })

    if (query) {
        flowchartsQuery = flowchartsQuery.ilike("title", `%${query}%`)
    }

    const { data: flowcharts } = await flowchartsQuery

    // Fetch Workspaces
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })

    return (
        <div className="p-6 md:p-12 space-y-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Flowcharts
                    </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    Visualize your ideas and workflows with beautiful, intuitive flowcharts
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
                    <CreateResourceModal type="flowchart" workspaces={workspaces || []} isGuest={isGuest}>
                        <button className="w-full h-full">
                            <Card className="h-40 border-2 border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-purple-400 dark:hover:border-purple-700">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl group-hover:shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                                    <Workflow className="text-white w-7 h-7" />
                                </div>
                                <span className="text-base font-semibold text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200">Create Flowchart</span>
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

            {/* My Flowcharts Section */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <Workflow className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Flowcharts</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Flowcharts List */}
                    {flowcharts?.map((flowchart) => (
                        <div key={flowchart.id} className="relative group block">
                            <Link href={`/flowchart/${flowchart.id}`}>
                                <Card className="h-52 hover:shadow-xl transition-all duration-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mb-2 group/card hover:border-purple-300 dark:hover:border-purple-800">
                                    <div className="p-4 flex flex-col h-full">
                                        <div className="flex-1 flex items-center justify-center">
                                            {flowchart.preview_img ? (
                                                <img src={flowchart.preview_img} alt="Flowchart preview" className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <svg viewBox="0 0 100 60" className="w-full h-48 stroke-slate-300 dark:stroke-slate-700 group-hover/card:stroke-purple-500 transition-colors duration-300 stroke-2 fill-none">
                                                    <rect x="10" y="10" width="20" height="15" />
                                                    <circle cx="50" cy="50" r="8" />
                                                    <path d="M30 17 L 80 17 L 80 40" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                                <div className="text-center">
                                    <span className="text-base font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">{flowchart.title || "Untitled"}</span>
                                </div>
                            </Link>
                            <ResourceOptions id={flowchart.id} title={flowchart.title || "Untitled"} type="flowchart" />
                        </div>
                    ))}

                    {/* New Flowchart Button */}
                    <CreateResourceModal type="flowchart" workspaces={workspaces || []} isGuest={isGuest}>
                        <button className="w-full h-full group">
                            <Card className="h-52 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center hover:shadow-xl transition-all duration-300 cursor-pointer mb-2 border-dashed border-2 hover:border-purple-400 dark:hover:border-purple-700">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl group-hover:shadow-xl shadow-purple-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                                        <Plus className="text-white w-7 h-7" />
                                    </div>
                                </div>
                            </Card>
                            <div className="text-center">
                                <span className="text-base font-semibold text-slate-600 dark:text-slate-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">New Flowchart</span>
                            </div>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
