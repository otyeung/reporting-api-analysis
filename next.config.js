/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15 optimizations
  experimental: {
    // Enable React 19 features when ready
    reactCompiler: false, // Set to true if you want to enable React Compiler (experimental)
  },
  // Enhanced error overlay
  typescript: {
    // Enable stricter TypeScript checking
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
