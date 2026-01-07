import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
    // AWS credentials are now only used server-side in /app/api/log/route.ts
    // They are accessed via process.env (injected by Amplify from Secrets Manager)
    // and should NOT be exposed to the client for security reasons

    DOCU_SEAL_KEY: process.env.DOCU_SEAL_KEY || "HVUdoF47kb8oTFA4x3AAz3unoqBkUZ8TCHGhVtPfXBX",
    DOCUSEAL_WEBHOOK_URL: process.env.DOCUSEAL_WEBHOOK_URL || "https://6v86shktqvbhsi.docuseal.dev/api/docuseal_webhook",
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Note: For API routes, body size limit may also need to be configured
  // via NEXT_BODY_SIZE_LIMIT environment variable in deployment (e.g., Amplify)

  webpack: (config) => {
    
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };

    return config;
  },
});
