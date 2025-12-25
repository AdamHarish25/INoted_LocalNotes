# Account Linking & Auth.js "Sticky Session" Debugging Report

**Date:** 2025-12-25
**Issue:** Google Login (`adamharits252@gmail.com`) was displaying data from a different account (`adamharits25@gmail.com`). Additionally, logging out and back in as a different Google user would sometimes "stick" to the previous user.

## 1. The Core Problems

### Problem A: Incorrect Account Linking (The "Wrong Data" Issue)
Auth.js (NextAuth) automatically linked a **new** Google account (`adamharits252`) to an **existing** User record in the database (`adamharits25`).
- **Why?** Likely because a "Sign in with Google" flow was initiated while the browser still had an active session for the old user. Auth.js interpreted this as "Link this new provider to my current account."
- **Result:** Both Google accounts pointed to `userId: eb53...` (the old account). Logging in as `252` effectively logged you in as `25`.

### Problem B: Sticky Sessions (The "Cannot Switch User" Issue)
Clicking "Sign Out" cleared the Supabase session but **left the Auth.js (Google) cookie intact**.
- **Result:** When attempting to sign in again, Auth.js saw the valid cookie and immediately re-authenticated the previous user without showing the Google account picker.

### Problem C: User Metadata Missing
The unified user object created by our custom helper (`getSupabaseUser`) was missing profile details (Name, Avatar) because it wasn't correctly merging Supabase metadata with Auth.js session data.

---

## 2. The Solutions (Step-by-Step)

### Fix 1: Unlinking the Accounts in Database
This was the smoking gun fix. We had to surgically remove the incorrect link.

1.  **Navigate to Supabase Dashboard** > **Table Editor**.
2.  Switch Schema from `public` to **`next_auth`**.
3.  Open the **`accounts`** table.
4.  **Identify the Bad Row:**
    *   Look for the `providerAccountId` corresponding to the *new* Google account (the one showing wrong data).
    *   Verify determining that its `userId` matches the *old* account's ID.
5.  **Delete that Row.**
    *   *Effect:* Auth.js no longer sees a link. The next time that Google account signs in, Auth.js creates a **new, separate** User record.

### Fix 2: Repairing the `signOut` Function
We updated `web/app/actions.ts` to ensure *both* authentication layers are cleared.

**Code Change:**
```typescript
import { signOut as nextAuthSignOut } from "@/auth"

export async function signOut() {
    // 1. Clear Supabase Session
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    // 2. Clear Auth.js (Google) Cookie
    await nextAuthSignOut({ redirectTo: "/" })
}
```

### Fix 3: Robust User Lookup (`getSupabaseUser`)
We hardened the logic in `web/utils/supabase/get-user.ts` to prevent "missing" an existing account due to minor data mismatches.

**Key Improvements:**
*   **Pagination:** now requests `perPage: 1000` (default was 50) to ensure we check *all* users.
*   **Normalization:** Uses `.toLowerCase().trim()` when comparing emails. `Adam@Gmail.com` now correctly matches `adam@gmail.com`.
*   **Metadata Sync:** Now correctly merges `match.user_metadata` with `session.user` details to ensure `display_name` and `avatar_url` are populated.

### Fix 4: Correct Profile Data in UI
We updated the `AppSidebar` to use a server action (`getAuthenticatedUser`) instead of the raw `supabase.auth.getUser()`.
*   **Why?** The raw Supabase client doesn't know about our custom metadata merging logic.
*   **Result:** The sidebar now receives the enriched user object (with Google profile picture and name) and displays it correctly.

---

## 3. Future Debugging Steps

If this happens again (User A sees User B's data):

1.  **Check `next_auth.accounts` table:**
    *   Filter by the `userId` of the account *whose data is being shown*.
    *   If you see multiple rows with `provider: google`, it means multiple Google accounts are linked to this one user.
    *   **Solution:** Delete the row for the account that *should* be separate.

2.  **Check `next_auth.users` table:**
    *   Ensure there are distinct rows for each unique email address.

3.  **Verify `signOut`:**
    *   If users complain they "can't switch accounts," it's almost always because `nextAuthSignOut` is not being called or the cookie isn't clearing.

4.  **Check Logs:**
    *   We added temporary debug logging to `getSupabaseUser.ts`. Re-enabling those logs (printing `session.user.email` vs `match.email`) quickly reveals if the system is finding the wrong user or no user at all.
