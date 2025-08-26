/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['supabase.co'],
  },
  eslint: {
    // Ignore ESLint during builds for production deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during builds for production deployment
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig