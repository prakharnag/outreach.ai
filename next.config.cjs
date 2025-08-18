/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  reactStrictMode: true,
  webpack: (config, { dev, isServer }) => {
    // Suppress Supabase realtime-js dynamic import warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
      {
        module: /node_modules\/@supabase\/realtime-js/,
      }
    ];

    // Additional webpack optimization for Supabase
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;

