import { AINotedClient } from "./client"
import { getSupabaseUser } from "@/utils/supabase/get-user"
import { redirect } from "next/navigation"

export default async function AINotedPage() {
    const { user } = await getSupabaseUser()

    if (!user) {
        redirect("/login")
    }

    return <AINotedClient initialUserId={user.id} />
}
