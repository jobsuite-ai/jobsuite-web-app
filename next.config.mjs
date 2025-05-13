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
    AWS_REGION: process.env.AWS_REGION || "us-west-2",
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "rl-peek-job-videos",
    AWS_PDF_BUCKET_NAME: process.env.AWS_PDF_BUCKET_NAME || "rl-peek-job-pdfs",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "AKIARZDBH2LKBSAFNPL7",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "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",
    JOB_TABLE_NAME: process.env.JOB_TABLE_NAME || "job",

    DOCU_SEAL_KEY: process.env.DOCU_SEAL_KEY || "HVUdoF47kb8oTFA4x3AAz3unoqBkUZ8TCHGhVtPfXBX",
    DOCUSEAL_WEBHOOK_URL: process.env.DOCUSEAL_WEBHOOK_URL || "https://6v86shktqvbhsi.docuseal.dev/api/docuseal_webhook",
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },

  webpack: (config) => {
    
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };

    return config;
  },
});
