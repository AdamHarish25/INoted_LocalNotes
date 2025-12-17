import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"

export default async function WhiteboardDashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
    const searchParams = await props.searchParams
    const query = searchParams?.q || ""

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Please log in</div>
    }

    // Fetch Whiteboards
    let whiteboardsQuery = supabase
        .from("whiteboards")
        .select("*")
        .eq("owner_id", user.id) // SECURITY FIX
        .order("created_at", { ascending: false })

    if (query) {
        whiteboardsQuery = whiteboardsQuery.ilike("title", `%${query}%`)
    }

    const { data: whiteboards } = await whiteboardsQuery

    // Fetch Workspaces
    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id) // SECURITY FIX
        .order("created_at", { ascending: false })

    return (
        <div className="p-8 space-y-8 bg-muted/30 dark:bg-background min-h-screen">
            {/* Search Bar */}
            <div className="flex justify-center mb-8">
                <SearchInput />
            </div>

            {/* My Whiteboard Section */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1">
                        <svg
                            className="w-5 h-5 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-400">My Whiteboard</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Whiteboards List */}
                    {whiteboards?.map((board) => (
                        <Link href={`/whiteboard/${board.id}`} key={board.id} className="block group">
                            <Card className="h-40 hover:shadow-md transition-all duration-200 group-hover:bg-slate-800 cursor-pointer border-slate-200 bg-white overflow-hidden mb-2">
                                <div className="p-4 flex flex-col h-full">
                                    <div className="flex-1 flex items-center justify-center">
                                        {board.content?.preview ? (
                                            board.content.preview.startsWith('data:image') ? (
                                                <img
                                                    src={board.content.preview}
                                                    alt="Whiteboard preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                                                    dangerouslySetInnerHTML={{ __html: board.content.preview }}
                                                />
                                            )
                                        ) : (
                                            <svg viewBox="0 0 100 60" className="w-full h-40 stroke-slate-600 group-hover:stroke-white transition-colors duration-200 stroke-2 fill-none">
                                                <path d="M10,10 Q30,50 50,30 T90,30" />
                                                <rect x="20" y="20" width="10" height="10" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </Card>
                            <div className="text-center">
                                <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700 transition-colors">{board.title || "Untitled"}</span>
                            </div>
                        </Link>
                    ))}

                    {/* New Whiteboard Button */}
                    <CreateResourceModal type="whiteboard" workspaces={workspaces || []}>
                        <button className="w-full h-full group">
                            <Card className="h-40 border-slate-200 bg-white group hover:bg-slate-800 flex items-center justify-center hover:shadow-md transition-colors duration-200 cursor-pointer mb-2">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 bg-blue-500 group-hover:shadow-md shadow-white rounded-full flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                                        <Plus className="text-white w-5 h-5" />
                                    </div>
                                </div>
                            </Card>
                            <div className="text-center">
                                <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700 transition-colors">New Whiteboard +</span>
                            </div>
                        </button>
                    </CreateResourceModal>
                </div>
            </section>
        </div>
    )
}
