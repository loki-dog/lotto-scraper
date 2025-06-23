// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: { externals: { '@sparticuz/chromium': string; }[]; }, { isServer }: any) => {
    if (isServer) {
      // Exclude @sparticuz/chromium from being bundled
      config.externals.push({
        '@sparticuz/chromium': '@sparticuz/chromium',
      });
    }
    return config;
  },
};

module.exports = nextConfig;