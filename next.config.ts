import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.com' },
    ],
  },
  // Required for Supabase Auth SSR
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
}

export default nextConfig
