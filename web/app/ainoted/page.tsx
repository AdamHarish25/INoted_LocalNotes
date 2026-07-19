import { AINotedClient } from "./client"
import { getSupabaseUser } from "@/utils/supabase/get-user"
import { getWorkspaces } from "@/app/actions"
import { redirect } from "next/navigation"

export default async function AINotedPage() {
    const { user } = await getSupabaseUser()

    if (!user) {
        redirect("/login")
    }

    const { data: workspaces } = await getWorkspaces()

    return <AINotedClient initialUserId={user.id} initialWorkspaces={workspaces || []} />
}
