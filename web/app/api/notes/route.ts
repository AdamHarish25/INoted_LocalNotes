import { NextResponse } from "next/server"
import { getSupabaseUser } from "@/app/actions"
import { createClient } from "@/utils/supabase/server"

// GET /api/notes - Mengambil semua notes milik user yang sedang login
export async function GET(request: Request) {
    // 1. Authenticate User (menggunakan logic yang sama dengan aplikasi kamu)
    const { user } = await getSupabaseUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Fetch Data dari Supabase
    // Kita buat client baru atau gunakan yang dari getSupabaseUser util
    // Di sini kita manual saja agar lebih kontrol jika perlu
    const supabase = await createClient()

    const { data: notes, error } = await supabase
        .from("notes")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Return JSON response
    return NextResponse.json({
        success: true,
        count: notes?.length || 0,
        data: notes
    })
}
