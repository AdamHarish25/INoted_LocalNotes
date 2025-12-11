import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/server"
// createNote and createWhiteboard actions are now used within the modal component
import { CreateResourceModal } from "@/components/CreateResourceModal"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ideally this should be handled by middleware, but safe check here
  // Note: Middleware already redirects unauthenticated users, so user should exist here if middleware is on.
  // But for robustness in case middleware matcher misses:
  if (!user) {
    return <div>Please log in</div>
  }

  // Fetch Notes
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })

  // Fetch Whiteboards
  const { data: whiteboards } = await supabase
    .from("whiteboards")
    .select("*")
    .order("created_at", { ascending: false })

  // Fetch Workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Search Bar */}
      <div className="flex justify-center mb-8">
        <div className="relative w-full max-w-xl">
          <Input
            placeholder="Search Notes"
            className="pl-4 pr-10 py-6 rounded-2xl border-slate-200 shadow-sm bg-white"
          />
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
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
          {notes?.map((note) => (
            <Link href={`/notes/${note.id}`} key={note.id}>
              <Card className="h-48 hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{note.title || "Untitled"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="pt-8">
                  <span className="bg-yellow-400/90 text-white text-[10px] px-3 py-1 rounded-full font-medium shadow-sm">
                    Notes
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}

          {/* New Note Button */}
          <CreateResourceModal type="note" workspaces={workspaces || []}>
            <button className="w-full h-full">
              <Card className="h-48 border-slate-200 bg-white flex items-center justify-center hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform mb-2">
                    <Plus className="text-white w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">New Note</span>
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
            <Link href={`/whiteboard/${board.id}`} key={board.id} className="block group">
              <Card className="h-40 hover:shadow-md transition-shadow cursor-pointer border-slate-200 bg-white overflow-hidden mb-2">
                <div className="p-4 flex flex-col h-full bg-white">
                  <div className="flex-1 flex items-center justify-center opacity-30">
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
                      <svg viewBox="0 0 100 60" className="w-full h-full stroke-slate-600 stroke-2 fill-none">
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
            <button className="w-full h-full">
              <Card className="h-40 border-slate-200 bg-white flex items-center justify-center hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform mb-2">
                    <Plus className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">New Whiteboard +</span>
                </div>
              </Card>
            </button>
          </CreateResourceModal>
        </div>
      </section>
    </div>
  )
}
