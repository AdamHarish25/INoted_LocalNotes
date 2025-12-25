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

            let matchedUser: any = null;

            // Sync/Lookup: Check if this email exists in Supabase 'auth.users' to unify accounts
            if (session.user.email) {
                // Fetch up to 1000 users to avoid pagination issues (default is 50)
                const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

                if (data && data.users) {
                    const searchEmail = session.user.email.toLowerCase().trim();

                    const match = data.users.find((u: any) => u.email?.toLowerCase().trim() === searchEmail)
                    if (match) {
                        matchedUser = match;
                        userId = match.id
                    } else {
                        // JIT Provisioning: Create user in Supabase if not found
                        // This fixes issues where 'notes' creation fails due to FK constraints on owner_id
                        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                            email: session.user.email,
                            email_confirm: true,
                            user_metadata: {
                                display_name: session.user.name || "User",
                                avatar_url: session.user.image,
                                full_name: session.user.name
                            }
                        })

                        if (newUser?.user) {
                            matchedUser = newUser.user;
                            userId = newUser.user.id
                        } else {
                            console.warn("JIT User Creation failed:", createError?.message)
                        }
                    }
                }
            }

            // Merge metadata: Supabase match takes precedence, invalid keys fallback to Session
            const existingMetadata = matchedUser?.user_metadata || {};
            const displayName = existingMetadata.display_name || existingMetadata.full_name || session.user.name || "User";
            const avatarUrl = existingMetadata.avatar_url || existingMetadata.picture || session.user.image;

            user = {
                id: userId,
                email: session.user.email,
                is_anonymous: false,
                aud: "authenticated",
                created_at: matchedUser?.created_at || new Date().toISOString(),
                app_metadata: matchedUser?.app_metadata || {},
                user_metadata: {
                    ...existingMetadata,
                    display_name: displayName,
                    avatar_url: avatarUrl,
                    full_name: displayName // ensuring compatibility
                },
                role: "authenticated"
            } as any
        }
    }
    return { supabase, user }
}
