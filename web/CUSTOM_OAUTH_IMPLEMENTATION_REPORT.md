# Budget-Friendly Custom OAuth URL Implementation Report

## 🎯 Objective
To achieve a professional, branded Google OAuth login experience (e.g., `accounts.google.com` says "Continue to **YourApp**" instead of "Supabase") without purchasing the expensive Supabase Custom Domain add-on ($10/mo + Pro Plan).

## 💡 The Solution: Auth.js (NextAuth) Wrapper
Instead of letting Supabase handle the OAuth handshake directly, we use **Auth.js (formerly NextAuth.js)** running on your own Next.js server to handle the authentication flow.

We bridge Auth.js with Supabase using the official `@auth/supabase-adapter`, ensuring that users authenticated via your domain still get stored cleanly in your Supabase database.

### Cost Comparison
| Feature | Standard Supabase OAuth | Supabase Custom Domain | **Our Solution (Auth.js)** |
| :--- | :--- | :--- | :--- |
| **URL Seen by User** | `monitor-app.supabase.co` | `auth.yourdomain.com` | `yourdomain.com` |
| **Branding** | "Continue to Supabase" | "Continue to YourApp" | **"Continue to YourApp"** |
| **Cost** | Free | ~$35/month (Pro + Addon) | **Free** (Open Source) |
| **Complexity** | Low | Low | **Medium** |

---

## 🛠 Implementation Guide

### 1. Architecture Overview
1.  **User** clicks "Login with Google".
2.  **Next.js App** (Auth.js) initiates request to Google (using your domain `localhost:3000` or `your-site.com`).
3.  **Google** authenticates user and redirects back to **Your App**.
4.  **Auth.js** verifies the token.
5.  **Supabase Adapter** automatically creates/updates the user in your Supabase Postgres database.
6.  **User Session** is established via a secure cookie on your domain.

### 2. Prerequisites & Installation
Installed the necessary packages to bridge Next.js, Auth.js, and Supabase.

```bash
npm install next-auth@beta @auth/supabase-adapter
```

### 3. Core Configuration Files

#### A. Auth Configuration (`web/auth.ts`)
This file configures NextAuth to use Google as a provider and Supabase as the database adapter.

```typescript
import NextAuth from "next-auth"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [Google],
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
})
```

#### B. API Route (`web/app/api/auth/[...nextauth]/route.ts`)
This exposes the necessary endpoints (`/api/auth/signin`, `/api/auth/callback`, etc.) that Auth.js needs to function.

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### 4. Google Cloud Setup (Crucial Step)
To ensure the "Supabase" URL never appears, we configured the OAuth Consent Screen and Credentials in Google Cloud Console.

*   **Authorized Origin**: `https://your-domain.com`
*   **Authorized Redirect URI**: `https://your-domain.com/api/auth/callback/google`
    *   *Note: We removed the `supabase.co` redirect URI entirely.*

### 5. Environment Variables (`.env.local`)
We added specific keys to enable this flow:

```env
# Authenticating with Google directly
AUTH_GOOGLE_ID="your-client-id"
AUTH_GOOGLE_SECRET="your-client-secret"

# Secure random string to encrypt session cookies
AUTH_SECRET="random-string-generated-by-openssl"

# Allows Auth.js to write users into Supabase Database
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 6. Handling Sessions & Middleware
Since standard Supabase helpers (`auth.getUser()`) look for Supabase-specific cookies, we had to patch the system to recognize Auth.js sessions too.

**Middleware Patch (`middleware.ts`)**:
```typescript
// Check for NextAuth session token if Supabase token is missing
const hasNextAuthSession = request.cookies.getAll().some(c => 
    c.name.includes('next-auth.session-token')
)
```

**Dashboard Patch (`dashboard/page.tsx`)**:
We implemented a fallback mechanism. If `supabase.auth.getUser()` returns null, we check `await auth()` from NextAuth.

```typescript
if (!user) {
    const session = await auth()
    if (session?.user) {
        // Manually construct user object for the UI
        user = { ...session.user }
    }
}
```

## ✅ Result
You now have a fully white-labeled authentication flow. Users see **your domain** during the entire process, creating a higher trust, premium feel without the recurring monthly costs.

### Future Considerations (Row Level Security)
One trade-off of this "Budgetless" approach is that **Supabase RLS (Row Level Security)** policies relying on `auth.uid()` need adjustment.
*   **Current State**: We are using the Service Role to bypass RLS for now or assuming public access for verified users.
*   **Ideal State**: For advanced security, we can implement "Token Minting" where Auth.js generates a custom Supabase JWT, allowing strict RLS usage.

---

## 🚨 Troubleshooting: Netlify Server Crash & Edge Runtime

**Issue:**
After deploying the Auth.js solution, the Netlify build crashed or served 500 errors on API routes.
**Error:** `Error: The Edge Runtime does not support Node.js 'crypto' module...` or incorrect adapter initialization.

**Cause:**
Auth.js beta and the `@auth/supabase-adapter` sometimes default to Node.js APIs not available in the standardized Edge Runtime, or configuration inconsistencies arise between local dev (Node) and production (Edge/Serverless).

**Solution:**
We ensured the application runs on **standard Node.js Serverless Functions** rather than forcing Edge Runtime for the Auth routes, which provides better compatibility with the Supabase Adapter.

1.  **Dependencies:** Ensure `next-auth@beta` and `@auth/supabase-adapter` are compatible.
2.  **Environment Variables:** Verified `AUTH_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` were present in Netlify UI.
3.  **Build Command:** Fixed by running `npm run build` which correctly generates the `.next` standalone folder.

### 4. Database Schema Setup (SQL Editor)
The `next_auth` schema and tables required manual initialization to ensure the adapter could write to them.

**Step 1: SQL Injection (Initialization)**
We navigated to the **Supabase SQL Editor** and executed the official Auth.js schema script to create the necessary structure:

```sql
-- 1. Create the schema
CREATE SCHEMA IF NOT EXISTS next_auth;

-- 2. Create the tables
CREATE TABLE IF NOT EXISTS next_auth.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text
);

CREATE TABLE IF NOT EXISTS next_auth.accounts (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text
);

CREATE TABLE IF NOT EXISTS next_auth.sessions (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    expires timestamp with time zone NOT NULL,
    "sessionToken" text NOT NULL
);
```

**Step 2: Exposing the Schema**
This was a critical missing step that caused "Relation not found" errors.
1.  Go to **Settings** > **API**.
2.  Find **"Exposed Schemas"**.
3.  Add `next_auth` to the list (alongside `public`).
4.  **Save**. This allows the Supabase client (and our adapter) to query `next_auth` tables via the API.

### 5. Supabase Project Settings & Service Role
To ensure the adapter could bypass RLS (Row Level Security) for authentication operations while maintaining security:
*   **Service Role Key:** We explicitly configured the Auth.js adapter to use `SUPABASE_SERVICE_ROLE_KEY` in `auth.ts`. This allows it to manage users in `next_auth` without being blocked by RLS policies.
*   **RLS Policies:** We verified that the Service Role has `bypass rls` privileges (default in Supabase), ensuring it can write to `next_auth.users` and `next_auth.accounts` regardless of policies.

---
*Updated 2025-12-25 with Account Linking Fixes*
