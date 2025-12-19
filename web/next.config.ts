import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.supabase.co https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://*.supabase.in https://accounts.google.com; frame-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://accounts.google.com;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
