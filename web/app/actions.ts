"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

import { getSupabaseUser as getSupabaseUserUtil } from "@/utils/supabase/get-user"

export async function getSupabaseUser() {
    return await getSupabaseUserUtil()
}

// Helper to auto-generate unique title for creation
async function getUniqueTitle(supabase: any, table: string, column: string, baseTitle: string, userId: string) {
    let title = baseTitle
    let counter = 1

    while (true) {
        let query = supabase.from(table).select(column).eq("owner_id", userId).eq(column, title)

        const { data, error } = await query

        if (error || !data || data.length === 0) {
            return title;
        }

        title = `${baseTitle} (${counter})`
        counter++
    }
}

// Helper to check for existing title for update (strict check)
async function checkTitleExists(supabase: any, table: string, column: string, title: string, userId: string, excludeId: string) {
    const { data } = await supabase
        .from(table)
        .select("id")
        .eq("owner_id", userId)
        .eq(column, title)
        .neq("id", excludeId)
        .single()
    return !!data
}

export async function createNote(formData: FormData | { title: string, workspace_id?: string }) {
    const { supabase, user } = await getSupabaseUser()

    // Check if user is logged in
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

    title = await getUniqueTitle(supabase, "notes", "title", title, user.id)

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
    const { supabase, user } = await getSupabaseUser()

    // Check if user is logged in
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

    title = await getUniqueTitle(supabase, "whiteboards", "title", title, user.id)

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

export async function updateNote(id: string, data: { content?: any, title?: string }) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const updates: any = { updated_at: new Date().toISOString() }
    if (data.content !== undefined) {
        updates.content = data.content

        try {
            const tasks = extractTasks(data.content)
            updates.tasks = tasks
        } catch (e) {
            console.error("Error extracting tasks:", e)
        }
    }

    if (data.title !== undefined) {
        const exists = await checkTitleExists(supabase, "notes", "title", data.title, user.id, id)
        if (exists) return { error: "Title already exists" }
        updates.title = data.title
    }

    let { data: result, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .eq("owner_id", user.id)
        .select("id")

    // Retry logic: If 'tasks' column invalid, retry without it
    if (error && error.code === '42703' && updates.tasks) {
        console.warn("Tasks column missing, retrying update without tasks...")
        delete updates.tasks
        const retryResult = await supabase
            .from("notes")
            .update(updates)
            .eq("id", id)
            .eq("owner_id", user.id)
            .select("id")

        result = retryResult.data
        error = retryResult.error
    }

    if (error) {
        console.error("Error updating note:", error)
        return { error: error.message }
    }

    if (!result || result.length === 0) {
        console.error("No note updated. Check RLS or owner_id match.")
        return { error: "No permission or note not found" }
    }

    return { success: true }
}

function extractTasks(content: any): any[] {
    const tasks: any[] = []

    function traverse(node: any) {
        if (node.type === 'taskItem') {
            // Extract text from node content (simplified)
            let text = ""
            if (node.content) {
                // Task items usually contain a paragraph which contains text
                // or directly text? Tiptap task item has 'paragraph' as content usually.
                node.content.forEach((child: any) => {
                    if (child.type === 'paragraph' && child.content) {
                        text += child.content.map((c: any) => c.text || "").join(" ")
                    } else if (child.text) {
                        text += child.text
                    }
                })
            }
            tasks.push({
                checked: node.attrs?.checked || false,
                text: text.trim()
            })
        }

        if (node.content) {
            node.content.forEach(traverse)
        }
    }

    if (content) traverse(content)
    return tasks
}

export async function updateNoteSharing(id: string, is_public: boolean) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("notes")
        .update({ is_public })
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error updating note sharing:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateWhiteboard(id: string, data: { content?: any, title?: string }) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const updates: any = { updated_at: new Date().toISOString() }
    if (data.content !== undefined) updates.content = data.content

    if (data.title !== undefined) {
        const exists = await checkTitleExists(supabase, "whiteboards", "title", data.title, user.id, id)
        if (exists) return { error: "Title already exists" }
        updates.title = data.title
    }

    const { data: result, error } = await supabase
        .from("whiteboards")
        .update(updates)
        .eq("id", id)
        .eq("owner_id", user.id)
        .select("id")

    if (error) {
        console.error("Error updating whiteboard:", error)
        return { error: error.message }
    }

    if (!result || result.length === 0) {
        console.error("No whiteboard updated. Check RLS or owner_id match.")
        return { error: "No permission or whiteboard not found" }
    }

    return { success: true }
}

export async function updateWhiteboardSharing(id: string, is_public: boolean) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("whiteboards")
        .update({ is_public })
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error updating whiteboard sharing:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function createFlowchart(formData: FormData | { title: string, workspace_id?: string }) {
    const { supabase, user } = await getSupabaseUser()

    // Check if user is logged in
    if (!user) {
        redirect("/login")
    }

    let title = "Untitled Flowchart";
    let workspace_id = null;

    if (formData instanceof FormData) {
        title = formData.get("title") as string || "Untitled Flowchart";
        workspace_id = formData.get("workspace_id") as string || null;
    } else if (typeof formData === 'object') {
        title = formData.title || "Untitled Flowchart";
        workspace_id = formData.workspace_id || null;
    }

    title = await getUniqueTitle(supabase, "flowcharts", "title", title, user.id)

    const { data, error } = await supabase
        .from("flowcharts")
        .insert({
            title,
            owner_id: user.id,
            workspace_id,
            content: [], // Empty array initially
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating flowchart:", error)
        return
    }

    if (data) {
        redirect(`/flowchart/${data.id}`)
    }
}

export async function updateFlowchart(id: string, data: { content?: any, title?: string }) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const updates: any = { updated_at: new Date().toISOString() }
    if (data.content !== undefined) updates.content = data.content

    if (data.title !== undefined) {
        const exists = await checkTitleExists(supabase, "flowcharts", "title", data.title, user.id, id)
        if (exists) return { error: "Title already exists" }
        updates.title = data.title
    }

    const { data: result, error } = await supabase
        .from("flowcharts")
        .update(updates)
        .eq("id", id)
        .eq("owner_id", user.id)
        .select("id")

    if (error) {
        console.error("Error updating flowchart:", error)
        return { error: error.message }
    }

    if (!result || result.length === 0) {
        console.error("No flowchart updated. Check RLS or owner_id match.")
        return { error: "No permission or flowchart not found" }
    }

    return { success: true }
}

export async function updateFlowchartSharing(id: string, is_public: boolean) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("flowcharts")
        .update({ is_public })
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error updating flowchart sharing:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteFlowchart(id: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("flowcharts")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error deleting flowchart:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function getFlowcharts() {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("flowcharts")
        .select("id, title, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })

    if (error) {
        console.error("Error fetching flowcharts:", error)
        return { error: error.message }
    }

    return { success: true, data }
}


// Workspaces

export async function createWorkspace(name: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    name = await getUniqueTitle(supabase, "workspaces", "name", name, user.id)

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
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching workspaces:", error)
        return { error: error.message }
    }

    return { success: true, data }
}

export async function assignNoteToWorkspace(noteId: string, workspaceId: string) {
    const { supabase, user } = await getSupabaseUser()
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

import { signOut as nextAuthSignOut } from "@/auth"

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    await nextAuthSignOut({ redirectTo: "/" })
}

export async function updateWorkspace(id: string, name: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const exists = await checkTitleExists(supabase, "workspaces", "name", name, user.id, id)
    if (exists) return { error: "Name already exists" }

    const { error } = await supabase
        .from("workspaces")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error updating workspace:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteWorkspace(id: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error deleting workspace:", error)
        return { error: error.message }
    }

    return { success: true }
}
export async function deleteNote(id: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error deleting note:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function deleteWhiteboard(id: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase
        .from("whiteboards")
        .delete()
        .eq("id", id)
        .eq("owner_id", user.id)

    if (error) {
        console.error("Error deleting whiteboard:", error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateProfile(displayName: string) {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
    })

    if (error) {
        console.error("Error updating profile:", error)
        return { error: error.message }
    }

    return { success: true }
}



export async function getWhiteboards() {
    const { supabase, user } = await getSupabaseUser()
    if (!user) return { error: "Unauthorized" }

    const { data, error } = await supabase
        .from("whiteboards")
        .select("id, title, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })

    if (error) {
        console.error("Error fetching whiteboards:", error)
        return { error: error.message }
    }

    return { success: true, data }
}
