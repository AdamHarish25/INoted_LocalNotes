import { Plus, Workflow, FileText, PenTool, Sparkles, Zap } from "lucide-react"
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

import { auth } from "@/auth"

export default async function DashboardPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const { getSupabaseUser } = await import("@/utils/supabase/get-user")
  let { supabase, user } = await getSupabaseUser()

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
    <div className="p-6 md:p-12 space-y-10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 min-h-screen">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back!
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          Your all-in-one workspace for notes, whiteboards, and flowcharts — let's get creative!
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <CreateResourceModal type="note" workspaces={workspaces || []} isGuest={isGuest}>
            <button className="w-full h-full">
              <Card className="h-40 border-2 border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-700">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl group-hover:shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <FileText className="text-white w-7 h-7" />
                </div>
                <span className="text-base font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">Create Note</span>
              </Card>
            </button>
          </CreateResourceModal>

          <CreateResourceModal type="whiteboard" workspaces={workspaces || []} isGuest={isGuest}>
            <button className="w-full h-full">
              <Card className="h-40 border-2 border-green-200 dark:border-green-900/50 bg-white dark:bg-slate-900 hover:bg-green-50 dark:hover:bg-green-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-green-400 dark:hover:border-green-700">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl group-hover:shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <PenTool className="text-white w-7 h-7" />
                </div>
                <span className="text-base font-semibold text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200">Start Whiteboard</span>
              </Card>
            </button>
          </CreateResourceModal>

          <CreateResourceModal type="flowchart" workspaces={workspaces || []} isGuest={isGuest}>
            <button className="w-full h-full">
              <Card className="h-40 border-2 border-purple-200 dark:border-purple-900/50 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 group transition-all duration-300 flex flex-col items-center justify-center hover:shadow-xl cursor-pointer hover:border-purple-400 dark:hover:border-purple-700">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl group-hover:shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 mb-3">
                  <Workflow className="text-white w-7 h-7" />
                </div>
                <span className="text-base font-semibold text-purple-700 dark:text-purple-300 group-hover:text-purple-800 dark:group-hover:text-purple-200">Draw Flowchart</span>
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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">My Notes</h2>
        </div>

        <div className="flex flex-col gap-3">
          {/* New Note Button */}
          <CreateResourceModal type="note" workspaces={workspaces || []} isGuest={isGuest}>
            <button className="w-full text-left">
              <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-dashed border-2 hover:border-blue-400 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer flex items-center gap-4 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <Plus className="text-white w-6 h-6" />
                </div>
                <span className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Create New Note</span>
              </Card>
            </button>
          </CreateResourceModal>

          {/* Notes List */}
          {notes?.map((note) => {
            const previewText = getPreviewText(note.content);
            const words = previewText.split(/\s+/).filter(w => w.length > 0);
            const truncatedPreview = words.slice(0, 15).join(" ") + (words.length > 15 ? "..." : "");
            const workspaceName = note.workspaces?.name || "Personal";

            return (
              <div key={note.id} className="relative group/wrapper">
                <Link href={`/notes/${note.id}`}>
                  <Card className="p-4 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all duration-300 cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between text-right gap-4 group/card hover:border-blue-300 dark:hover:border-blue-800">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/card:text-blue-700 dark:group-hover/card:text-blue-300">
                        {note.title || "Untitled"}
                      </h3>
                      {/* <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {truncatedPreview || "Empty note"}
                      </p> */}
                    </div>
                    <div className="hidden sm:flex flex-col items-start justify-start gap-1 shrink-0 px-8">
                      <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                        {workspaceName}
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
            )
          })}
        </div>
      </section>

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
