/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PORT: "3000"
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
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
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
  distDir: '.next',
  // Optimizations for faster development compilation
  ...(process.env.NODE_ENV === 'development' && {
    // Disable source maps in development for faster compilation
    productionBrowserSourceMaps: false,
  }),
  webpack: (config, { isServer }) => {
    // Fix for Node.js modules in client-side (like crypto)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
}

// Wrap with Sentry config for sourcemaps (only if Sentry is enabled)
const enableSentry = process.env.NEXT_PUBLIC_SENTRY_ENABLE === 'true' && process.env.NEXT_PUBLIC_SENTRY_DSN;

if (enableSentry) {
  const { withSentryConfig } = require('@sentry/nextjs');
  
  module.exports = withSentryConfig(
    nextConfig,
    {
      // Sentry webpack plugin options
      silent: true, // Suppresses source map uploading logs
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN, // Only used in CI, never in client
    },
    {
      // Sentry options
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    }
  );
} else {
  module.exports = nextConfig;
} 