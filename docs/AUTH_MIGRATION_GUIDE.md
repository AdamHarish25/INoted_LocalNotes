# Auth.js + Supabase Integration Guide

I have set up the core files for Auth.js (NextAuth v5) with Supabase Adapter. To complete the migration and enable your Custom OAuth URL, follow these steps:

## 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# Generated via `npx auth secret` or just a random 32+ char string
AUTH_SECRET="your-random-secret-here" 

# Your Google OAuth Credentials (from Google Cloud Console)
AUTH_GOOGLE_ID="your-client-id"
AUTH_GOOGLE_SECRET="your-client-secret"

# Supabase Service Role Key (Required for the Adapter to write to DB)
# Find this in Supabase Dashboard -> Project Settings -> API
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR..."
```

## 2. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and go to **APIs & Services > Credentials**.
3. Edit your OAuth 2.0 Client ID.
4. **IMPORTANT**: Change the **Authorized redirect URI** to your domain (or localhost for dev).
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
   *(Note: It is no longer `supabase.co`)*

## 3. Update Login Logic

I have added a `loginWithGoogle` server action in `app/login/actions.ts`.
You need to update your `components/auth/login-content.tsx` to use this new action instead of `supabase.auth.signInWithOAuth`.

**Example Change in `components/auth/login-content.tsx`**:

```tsx
import { loginWithGoogle } from "@/app/login/actions"
// ...

const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
        await loginWithGoogle() 
        // Note: The server action handles the redirect
    } catch (error) {
        console.error("Login failed", error)
        setIsLoading(false)
    }
}
```

## 4. Middleware & Session Management (Crucial)

Currently, your `middleware.ts` uses Supabase Auth (`updateSession`). This relies on Supabase cookies.
When you switch to Auth.js, the session cookie will change.

**Warning on RLS (Row Level Security):**
Auth.js stores users in the `next_auth` schema (by default, or as mapped). The standard Supabase `createClient()` in your app uses the `anon` key and expects a Supabase JWT to respect RLS policies (`auth.uid()`).
NextAuth does **not** automatically provide this Supabase JWT.

If your app relies on `auth.uid()` in Postgres policies, those queries might fail or return empty data.

**Solutions**:
1. **Disable RLS** (Not recommended).
2. **Custom JWT**: Configure Auth.js to sign a JWT with your Supabase `JWT Secret` and pass it to the Supabase Client. This allows you to keep using RLS.

To do this, you would need to modify `auth.ts` to include a session callback that tokenizes the session for Supabase.

For now, verify the basic OAuth flow works. Once logged in, you will be in the `next_auth.users` table (or `users` table mapped by adapter).

## 5. Verify the Database

The `@auth/supabase-adapter` should automatically create the necessary tables in your Supabase database. Check your Table Editor in Supabase for a `next_auth` schema (or check if `users` table is populated).
