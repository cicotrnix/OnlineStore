/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // stripe + aws-sdk se cargan dinámicamente con require interno; quedan
  // como externos para evitar bundling de tree-shake mal-comportado.
  experimental: {
    serverComponentsExternalPackages: ['stripe', '@aws-sdk/client-s3'],
  },
}

export default nextConfig
