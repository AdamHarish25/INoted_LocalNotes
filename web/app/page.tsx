import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"
import { SearchInput } from "@/components/search-input"
import { ResourceOptions } from "@/components/resource-options"

export default async function DashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ideally this should be handled by middleware, but safe check here
  // Note: Middleware already redirects unauthenticated users, so user should exist here if middleware is on.
  // But for robustness in case middleware matcher misses:
  if (!user) {
    return <div>Please log in</div>
  }

  // Fetch Notes
  let notesQuery = supabase
    .from("notes")
    .select("*, workspaces(name)")
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

  // Fetch Whiteboards
  let whiteboardsQuery = supabase
    .from("whiteboards")
    .select("*")
    .order("created_at", { ascending: false })

  if (query) {
    whiteboardsQuery = whiteboardsQuery.ilike("title", `%${query}%`)
  }

  const { data: whiteboards } = await whiteboardsQuery

  // Fetch Workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
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
                  <Card className="h-48 py-4 hover:shadow-md hover:bg-slate-800 transition-all duration-200 cursor-pointer border-slate-200 bg-white flex flex-col group/card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium group-hover/card:text-white text-slate-500 truncate mr-6">{note.title || "Untitled"}</CardTitle>
                      <p className="text-[10px] text-slate-300 group-hover/card:text-white">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex items-center justify-center p-4">
                      <p className="text-sm text-slate-400 group-hover/card:text-white font-medium text-center break-all italic">
                        {truncatedPreview || "No content"}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-2 pb-4 flex justify-end">
                      <span className="bg-yellow-400/90 text-white group-hover/card:text-white text-[10px] px-3 py-1 rounded-full font-medium shadow-sm truncate max-w-[100px]">
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
          <CreateResourceModal type="note" workspaces={workspaces || []}>
            <button className="w-full h-full">
              <Card className="h-48 border-slate-200 bg-white hover:bg-slate-800 group transition-all duration-200 flex items-center justify-center hover:shadow-md cursor-pointer group">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full group-hover:shadow-md shadow-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform mb-2">
                    <Plus className="text-white w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-white">New Note</span>
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
            <div key={board.id} className="relative group block">
              <Link href={`/whiteboard/${board.id}`}>
                <Card className="h-40 hover:shadow-md transition-all duration-200 hover:bg-slate-800 cursor-pointer border-slate-200 bg-white overflow-hidden mb-2 group/card">
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
                        <svg viewBox="0 0 100 60" className="w-full h-40 stroke-slate-600 group-hover/card:stroke-white transition-colors duration-200 stroke-2 fill-none">
                          <path d="M10,10 Q30,50 50,30 T90,30" />
                          <rect x="20" y="20" width="10" height="10" />
                        </svg>
                      )}
                    </div>
                  </div>
                </Card>
                <div className="text-center">
                  <span className="text-sm text-slate-500 font-medium hover:text-slate-700 transition-colors">{board.title || "Untitled"}</span>
                </div>
              </Link>
              <ResourceOptions id={board.id} title={board.title || "Untitled"} type="whiteboard" />
            </div>
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
