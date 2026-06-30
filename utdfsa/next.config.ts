import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // suppress X-Powered-By: Next.js header to avoid advertising the framework
  poweredByHeader: false,
  // allow ngrok tunnels for mobile testing — covers all three common ngrok domain formats
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.ngrok.app', 'diameter-morphine-deceased.ngrok-free.dev'],
  // images.qualities — allowed quality values for next/image optimization
  // external image sources (google profile photos, s3 cover photos) are permitted via the img-src CSP rule in headers() below
  // do not remove the googleusercontent.com entry from the CSP — navbar avatar uses it
  images: {
    qualities: [75, 85, 90, 95],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // prevents clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // prevents MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // controls referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // enforce HTTPS for 2 years; include subdomains
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          // restricts what resources the page can load
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // allow Google profile images in the navbar and S3 cover photos
              "img-src 'self' data: https://lh3.googleusercontent.com https://*.amazonaws.com",
              "font-src 'self'",
              // allow Supabase and Stripe connections
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL} https://api.stripe.com`,
              // allow YouTube privacy-enhanced embeds on the Modern dance team page
              "frame-src https://www.youtube-nocookie.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig