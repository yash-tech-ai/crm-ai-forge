/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@crm-ai-forge/shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
