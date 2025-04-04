/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure webpack to handle TypeScript files
  webpack: (config) => {
    return config;
  }
};

export default nextConfig; 