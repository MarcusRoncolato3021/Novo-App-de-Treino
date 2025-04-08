/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
})

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false
      }
    }
    return config
  },
  // Configurações de performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'react-hot-toast'],
    serverComponentsExternalPackages: ['dexie']
  },
  // Configurações de TypeScript
  typescript: {
    ignoreBuildErrors: false
  },
  // Configurações de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  // Configurações adicionais
  poweredByHeader: false,
  compress: true
}

module.exports = withPWA(nextConfig) 