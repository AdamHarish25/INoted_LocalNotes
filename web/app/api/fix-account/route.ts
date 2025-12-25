import { createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    const supabase = await createAdminClient()

    // The account ID for adamharits252 (providerAccountId "112058746741202166792") that is wrongly linked
    const badProviderAccountId = "112058746741202166792"

    const { data, error } = await supabase
        .schema('next_auth')
        .from('accounts')
        .delete()
        .eq('providerAccountId', badProviderAccountId)
        .select()

    const { error: sessionError } = await supabase
        .schema('next_auth')
        .from('sessions')
        .delete()
        .neq('id', '0') // Delete all sessions to force re-login

    return NextResponse.json({
        deletedAccount: data,
        error,
        sessionError
    })
}
