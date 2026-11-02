/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Google Analytics client uses gRPC, which breaks when webpack bundles it
  // (every call fails with "undefined undefined: undefined"). Load it from
  // node_modules at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['@google-analytics/data', 'google-gax', '@grpc/grpc-js'],
  },
  // The dashboard used to have a tab per area; it's now one page per club.
  // Old links and bookmarks go to it (the ?viewAs= query is kept).
  async redirects() {
    return ['enquiries', 'visitors', 'membership', 'email', 'paid-social', 'pages', 'utms', 'seo', 'report']
      .map((tab) => ({ source: `/dashboard/${tab}`, destination: '/dashboard', permanent: false }))
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Browser bundles should never include server-only Node modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'pg-native': false,
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:", // club logos are hosted on their own websites
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
