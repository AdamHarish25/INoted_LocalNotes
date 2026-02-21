import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.supabase.co https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.supabase.in https://accounts.google.com wss://*.supabase.co wss://*.supabase.in https://inoted-collab-server-production.up.railway.app wss://inoted-collab-server-production.up.railway.app https://api.github.com/* https://api.github.com/gists; frame-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://accounts.google.com;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
