import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/crownlink/:path*",
        destination: "/bloodline-arena/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // Keep the existing route implementation and registered API callbacks.
    // Redirects run before rewrites, so this does not redirect back in a loop.
    return [
      {
        source: "/bloodline-arena/:path*",
        destination: "/crownlink/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "luorfutnhyopoepdxfln.supabase.co",
        pathname: "/storage/v1/object/public/agent-images/**",
      },
    ],
  },
};

export default nextConfig;
