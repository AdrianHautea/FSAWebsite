import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig