/* eslint-disable @typescript-eslint/no-explicit-any */
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  webpack: (config: { externals: { '@sparticuz/chromium': string; }[]; resolve: { alias: any; }; }, { isServer }: any) => {
    if (isServer) {
      // Exclude @sparticuz/chromium from being bundled
      config.externals.push({
        '@sparticuz/chromium': '@sparticuz/chromium',
      });
    }
    
    // Add alias support for module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    
    return config;
  },
};

module.exports = nextConfig;