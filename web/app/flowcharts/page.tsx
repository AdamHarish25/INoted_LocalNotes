import { Plus } from "lucide-react"
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

    let supabase = await createClient()
    let { data: { user } } = await supabase.auth.getUser()

    // Check if user is anonymous (guest)
    let isGuest = user?.is_anonymous ?? false;

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
        } else {
            redirect("/login")
        }
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
        <div className="p-8 space-y-8 bg-muted/30 dark:bg-background min-h-screen">
            {/* Guest Banner */}
            {isGuest && <GuestBanner />}

            {/* Search Bar */}
            <div className="flex justify-center mb-8">
                <SearchInput />
            </div>

            {/* My Flowcharts Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1">
                        <svg
                            className="w-5 h-5 text-slate-400 dark:text-zinc-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            {/* Generic flowchart icon, maybe replace with workflow icon */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-400 dark:text-zinc-500">My Flowcharts</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Flowcharts List */}
                    {flowcharts?.map((flowchart) => (
                        <div key={flowchart.id} className="relative group block">
                            <Link href={`/flowchart/${flowchart.id}`}>
                                <Card className="h-40 hover:shadow-md transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden mb-2 group/card">
                                    <div className="p-4 flex flex-col h-full">
                                        <div className="flex-1 flex items-center justify-center">
                                            {/* Static preview icon for now */}
                                            <svg viewBox="0 0 100 60" className="w-full h-40 stroke-slate-300 dark:stroke-zinc-700 group-hover/card:stroke-purple-400 transition-colors duration-200 stroke-2 fill-none">
                                                <rect x="10" y="10" width="20" height="15" />
                                                <circle cx="50" cy="50" r="8" />
                                                <path d="M30 17 L 80 17 L 80 40" />
                                            </svg>
                                        </div>
                                    </div>
                                </Card>
                                <div className="text-center">
                                    <span className="text-sm text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">{flowchart.title || "Untitled"}</span>
                                </div>
                            </Link>
                            <ResourceOptions id={flowchart.id} title={flowchart.title || "Untitled"} type="flowchart" />
                        </div>
                    ))}

                    {/* New Flowchart Button */}
                    <CreateResourceModal type="flowchart" workspaces={workspaces || []} isGuest={isGuest}>
                        <button className="w-full h-full group">
                            <Card className="h-40 border-slate-200 dark:border-zinc-800 bg-white dark:bg-black group hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-center hover:shadow-md transition-colors duration-200 cursor-pointer mb-2 border-dashed">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-purple-500 group-hover:shadow-md shadow-purple-200 dark:shadow-none rounded-full flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                                        <Plus className="text-white w-5 h-5" />
                                    </div>
                                    <span className="text-sm text-slate-500 dark:text-zinc-400 font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">New Flowchart +</span>
                                </div>
                            </Card>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
