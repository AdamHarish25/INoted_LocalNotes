import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SettingsUI } from "@/components/settings/settings-ui"

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
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
