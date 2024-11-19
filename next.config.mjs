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
    NEXT_PUBLIC_BASE_URL: process.env.BASE_URL || "localhost",
    NEXT_PUBLIC_PORT: process.env.PORT || "3000",
    /**👇 I forgot to add this here**/
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || "",
    AWS_REGION: process.env.AWS_REGION || "us-west-2",
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "rl-peek-job-videos",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "AKIARZDBH2LKBSAFNPL7",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "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",
    BASE_URL: process.env.BASE_URL || "http://localhost:3000",
    JOB_TABLE_NAME: process.env.JOB_TABLE_NAME || "job",

    DOCU_SEAL_KEY: process.env.JOB_TABLE_NAME || "peKFECsD79yHyd5CTeyXUXZGiu8RPnnruqhGL9v5xGT",
  },
  feature: {
    webpack5: true,
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },

  webpack: (config) => {
    
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };

    return config;
  },
});
