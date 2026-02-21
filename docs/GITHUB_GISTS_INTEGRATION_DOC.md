# GitHub Gists API Integration - CSP Updates

## Overview
This document logs the changes made to correctly integrate the `https://api.github.com` endpoints into the application's Content Security Policy (CSP). This allows the application to fetch and create gists for the Git Notes integration without being blocked by the browser.

## Changes Made

### 1. Update `next.config.ts`
The GitHub API was added to the `connect-src` directive in the `Content-Security-Policy` header inside `next.config.ts`. 

**Added domains:** 
- `https://api.github.com/*`
- `https://api.github.com/gists`

**Reasoning:** During local development and standard Next.js building, the configuration file injects security headers. Adding the API URLs here is the first step towards permitting secure outbound connections specifically to the GitHub Gists endpoint.

### 2. Update `utils/supabase/middleware.ts`
The application relies on Supabase SSR middleware, which intercepts incoming requests and overrides or sets headers (like cookies and CSP) to manage sessions correctly.

**Action:** Overrode the CSP header similarly to `next.config.ts` to include the GitHub API URLs within the `connect-src` directive.

```typescript
// Inside utils/supabase/middleware.ts
supabaseResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.supabase.co https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.supabase.in https://accounts.google.com wss://*.supabase.co wss://*.supabase.in https://inoted-collab-server-production.up.railway.app wss://inoted-collab-server-production.up.railway.app https://api.github.com/* https://api.github.com/gists; frame-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://accounts.google.com;"
)
```

**Reasoning:** Since `middleware.ts` handles session routing and security configurations dynamically upon requests, omitting the GitHub URL here would lead to the middleware overwriting the headers and recreating the `Refused to connect` error.

## Troubleshooting

- **CSP Block Errors**: If you encounter errors mentioning `Content-Security-Policy: The page's settings blocked the loading of a resource at https://api.github.com/gists`, double check both `next.config.ts` and `utils/supabase/middleware.ts` to ensure the URLs haven't been reverted or overwritten. 
- **Different Endpoints**: If the integration requires connecting to paths other than `api.github.com`, append the domains with similar spacing exactly as they appear in the documentation inside the `connect-src` chunk.
