import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  // Output: "export" removed to enable Dynamic SSR / Image Optimization
  images: {
    // Unoptimized: true removed to allow Next.js server-side optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ]
  },
};

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzerConfig(nextConfig);
