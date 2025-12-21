/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PORT: "3004"
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3004',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      }
    ],
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  distDir: '.next'
}

module.exports = nextConfig 