import { createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = await createAdminClient()

    // Check Users
    const { data: users, error: usersError } = await supabase
        .schema('next_auth')
        .from('users')
        .select('*')

    // Check Accounts
    const { data: accounts, error: accountsError } = await supabase
        .schema('next_auth')
        .from('accounts')
        .select('*')

    // Check Sessions (Optional)
    const { data: sessions, error: sessionsError } = await supabase
        .schema('next_auth')
        .from('sessions')
        .select('*')

    return NextResponse.json({
        users,
        usersError,
        accounts,
        accountsError,
        sessions,
        sessionsError
    })
}
