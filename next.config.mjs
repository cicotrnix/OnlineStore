/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // posthog-node usa worker_threads; sin esto Next bundlea mal el chunk en
  // serverless/dev (Cannot find module 'lib/worker.js'). También aplica a
  // stripe + aws-sdk que se cargan dinámicamente.
  experimental: {
    serverComponentsExternalPackages: ['posthog-node', 'stripe', '@aws-sdk/client-s3'],
  },
}

export default nextConfig
