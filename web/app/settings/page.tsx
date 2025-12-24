import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SettingsUI } from "@/components/settings/settings-ui"

export default async function SettingsPage() {
    let supabase = await createClient()
    let { data: { user } } = await supabase.auth.getUser()

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

    return (
        <div className="p-8 space-y-8 bg-muted/30 dark:bg-background min-h-screen">
            <div>
                <h1 className="text-2xl font-bold dark:text-white tracking-tight mb-2">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account settings and preferences.</p>
            </div>

            <SettingsUI user={user} />
        </div>
    )
}
