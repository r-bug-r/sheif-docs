import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "mammoth", "pg"],
};

export default nextConfig;
