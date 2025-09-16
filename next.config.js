/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true,
  },
  images: {
    domains: [],
    dangerouslyAllowSVG: true,
  },
};

module.exports = nextConfig;
