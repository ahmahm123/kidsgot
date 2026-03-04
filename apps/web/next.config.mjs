/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@humanrent/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
