"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function createNote(formData: FormData | { title: string, workspace_id?: string }) {
    const supabase = await createClient()

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    let title = "Untitled Note";
    let workspace_id = null;

    if (formData instanceof FormData) {
        title = formData.get("title") as string || "Untitled Note";
        workspace_id = formData.get("workspace_id") as string || null;
    } else if (typeof formData === 'object') {
        title = formData.title || "Untitled Note";
        workspace_id = formData.workspace_id || null;
    }

    const { data, error } = await supabase
        .from("notes")
        .insert({
            title,
            owner_id: user.id,
            workspace_id,
            content: {}, // Empty content initially
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating note:", error)
        return
    }

    if (data) {
        redirect(`/notes/${data.id}`)
    }
}

export async function createWhiteboard(formData: FormData | { title: string, workspace_id?: string }) {
    const supabase = await createClient()

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect("/login")
    }

    let title = "Untitled Whiteboard";
    let workspace_id = null;

    if (formData instanceof FormData) {
        title = formData.get("title") as string || "Untitled Whiteboard";
        workspace_id = formData.get("workspace_id") as string || null;
    } else if (typeof formData === 'object') {
        title = formData.title || "Untitled Whiteboard";
        workspace_id = formData.workspace_id || null;
    }

    const { data, error } = await supabase
        .from("whiteboards")
        .insert({
            title,
            owner_id: user.id,
            workspace_id,
            content: {},
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating whiteboard:", error)
        return
    }

    if (data) {
        redirect(`/whiteboard/${data.id}`)
    }
}

export async function updateNote(id: string, content: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", user.id)
        .select("id")

    if (error) {
        console.error("Error updating note:", error)
        return { error: error.message }
    }

    if (!data || data.length === 0) {
        console.error("No note updated. Check RLS or owner_id match.")
        return { error: "No permission or note not found" }
    }

    return { success: true }
}

export async function updateWhiteboard(id: string, content: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("whiteboards")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", user.id)
        .select("id")

    if (error) {
        console.error("Error updating whiteboard:", error)
        return { error: error.message }
    }

    if (!data || data.length === 0) {
        console.error("No whiteboard updated. Check RLS or owner_id match.")
        return { error: "No permission or whiteboard not found" }
    }

    return { success: true }
}


// Workspaces

export async function createWorkspace(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("workspaces")
        .insert({
            name,
            owner_id: user.id
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating workspace:", error)
        return { error: error.message }
    }

    return { success: true, data }
}

export async function getWorkspaces() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching workspaces:", error)
        return { error: error.message }
    }

    return { success: true, data }
}

export async function assignNoteToWorkspace(noteId: string, workspaceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("notes")
        .update({ workspace_id: workspaceId })
        .eq("id", noteId)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error assigning workspace:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
}
