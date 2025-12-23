import { Plus, Workflow } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { ResourceOptions } from "@/components/resource-options"
import { GuestBanner } from "@/components/guest-banner"

export default async function DashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is anonymous (guest)
  const isGuest = user?.is_anonymous ?? false;

  // Ideally this should be handled by middleware, but safe check here
  if (!user) {
    redirect("/login")
  }

  // Fetch Notes
  let notesQuery = supabase
    .from("notes")
    .select("*, workspaces(name)")
    .order("created_at", { ascending: false })

  // If not guest, only show own notes. If guest, perhaps show nothing or public demo notes?
  // Since guest users are real users in Supabase, they have an ID. 
  // Initially, their list will be empty.
  if (!isGuest) {
    notesQuery = notesQuery.eq("owner_id", user.id)
  } else {
    // For guests, we might want to show their own 'temp' notes if they created any?
    // Since RLS policies might allow insert for anon, they can technically be own_id = user.id (anon id)
    // But user requested "forbidden to make a new notes".
    // So assuming they can't create anything, this list is effectively empty or shows nothing.
    // But to be safe and consistent with strict RLS:
    notesQuery = notesQuery.eq("owner_id", user.id)
  }

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

  // Fetch Whiteboards
  let whiteboardsQuery = supabase
    .from("whiteboards")
    .select("*")
    .eq("owner_id", user.id) // SECURITY FIX: Only fetch current user's whiteboards
    .order("created_at", { ascending: false })

  if (query) {
    whiteboardsQuery = whiteboardsQuery.ilike("title", `%${query}%`)
  }

  const { data: whiteboards } = await whiteboardsQuery

  // Fetch Flowcharts
  let flowchartsQuery = supabase
    .from("flowcharts")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  if (query) {
    flowchartsQuery = flowchartsQuery.ilike("title", `%${query}%`)
  }

  const { data: flowcharts } = await flowchartsQuery

  // Fetch Workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id) // SECURITY FIX
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
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-400">My Notes</h2>
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

      {/* My Whiteboard Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1">
            <svg
              className="w-5 h-5 text-slate-400 dark:text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-400 dark:text-zinc-500">My Whiteboard</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Whiteboards List */}
          {whiteboards?.map((board) => (
            <div key={board.id} className="relative group block">
              <Link href={`/whiteboard/${board.id}`}>
                <Card className="h-40 hover:shadow-md transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-black overflow-hidden mb-2 group/card">
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
                        <svg viewBox="0 0 100 60" className="w-full h-40 stroke-slate-300 dark:stroke-zinc-700 group-hover/card:stroke-blue-400 transition-colors duration-200 stroke-2 fill-none">
                          <path d="M10,10 Q30,50 50,30 T90,30" />
                          <rect x="20" y="20" width="10" height="10" />
                        </svg>
                      )}
                    </div>
                  </div>
                </Card>
                <div className="text-center">
                  <span className="text-sm text-slate-500 dark:text-zinc-400 font-medium hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">{board.title || "Untitled"}</span>
                </div>
              </Link>
              <ResourceOptions id={board.id} title={board.title || "Untitled"} type="whiteboard" />
            </div>
          ))}

          {/* New Whiteboard Button */}
          <CreateResourceModal type="whiteboard" workspaces={workspaces || []} isGuest={isGuest}>
            <button className="w-full h-full group">
              <Card className="h-40 border-slate-200 dark:border-zinc-800 bg-white dark:bg-black group hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-center hover:shadow-md transition-colors duration-200 cursor-pointer mb-2 border-dashed">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-500 group-hover:shadow-md shadow-blue-200 dark:shadow-none rounded-full flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                    <Plus className="text-white w-5 h-5" />
                  </div>
                </div>
              </Card>
              <div className="text-center">
                <span className="text-sm text-slate-500 dark:text-zinc-400 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New Whiteboard +</span>
              </div>
            </button>
          </CreateResourceModal>
        </div>
      </section>

      {/* My Flowcharts Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1">
            <Workflow className="w-5 h-5 text-slate-400 dark:text-zinc-500" />
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
                </div>
              </Card>
              <div className="text-center">
                <span className="text-sm text-slate-500 dark:text-zinc-400 font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">New Flowchart +</span>
              </div>
            </button>
          </CreateResourceModal>
        </div>
      </section>
    </div>
  )
}
