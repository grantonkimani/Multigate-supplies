/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Enable PDFKit for server-side PDF generation
  serverExternalPackages: ['pdfkit', 'nodemailer'],
  images: {
    unoptimized: false,
    domains: ['localhost', 'supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'shrmobyhfmkbxdkmlqca.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [25, 50, 75, 85, 90, 100], // Add explicit quality configuration
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    // Get allowed origins from environment variable, fallback to localhost for development
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          // CORS will be handled dynamically in API routes for better security
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/uploads/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, immutable' },
          { key: 'Content-Security-Policy', value: "default-src 'self'" },
        ],
      },
      {
        source: '/uploads/wine-liquor/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' }, // 7 days for wine/liquor images
          { key: 'Content-Security-Policy', value: "default-src 'self'" },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/logo-mark.png' }];
  },
};

module.exports = nextConfig;
