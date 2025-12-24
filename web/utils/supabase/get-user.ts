import { createClient, createAdminClient } from "@/utils/supabase/server"

export async function getSupabaseUser() {
    let supabase = await createClient()
    let { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        const { auth } = await import("@/auth")
        const session = await auth()
        if (session?.user) {
            supabase = await createAdminClient()

            // Default ID from Auth.js
            let userId = session.user.id as string

            // Sync/Lookup: Check if this email exists in Supabase 'auth.users' to unify accounts
            if (session.user.email) {
                const { data } = await supabase.auth.admin.listUsers()

                if (data && data.users) {
                    const match = data.users.find((u: any) => u.email === session?.user?.email)
                    if (match) {
                        userId = match.id
                    }
                }
            }

            user = {
                id: userId,
                email: session.user.email,
                is_anonymous: false,
                aud: "authenticated",
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                role: "authenticated"
            } as any
        }
    }
    return { supabase, user }
}
