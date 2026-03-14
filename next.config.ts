import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { getAllowedRemoteImagePatterns } from "./src/lib/media-hosts";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: getAllowedRemoteImagePatterns(),
  },
};

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzerConfig(nextConfig);
