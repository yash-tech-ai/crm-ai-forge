/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@crm-ai-forge/shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
