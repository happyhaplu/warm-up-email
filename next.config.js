module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma']
  }
}
