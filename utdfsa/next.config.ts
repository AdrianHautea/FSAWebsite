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
    qualities: [75, 80, 85, 90, 95],
    // AVIF first (~20-30% smaller than WebP at equal quality), WebP fallback —
    // this is a photo-heavy site, so format choice matters on every page
    formats: ['image/avif', 'image/webp'],
    // build assets only change on redeploy, so cache optimizer output generously
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        // pinned to the exact cover-photos bucket (utils/s3.ts builds this same host) —
        // a wildcard *.amazonaws.com let next/image proxy/optimize/cache ANY S3 bucket
        // on the internet through this origin (bandwidth abuse, cache poisoning)
        hostname: 'cover-photos-gal.s3.us-east-2.amazonaws.com',
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
          // enforce HTTPS for 2 years; include subdomains; preload-eligible
          // (max-age exceeds the 1-year minimum, includeSubDomains present) —
          // actual hstspreload.org submission is a separate manual step
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // deny every browser feature by default; camera stays same-origin-only
          // for officer/scan's QR reader (html5-qrcode) — nothing else in the app
          // calls geolocation/microphone/payment APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          // Content-Security-Policy moved to proxy.ts — it now needs a fresh per-request
          // nonce for script-src, which only proxy/middleware can generate
        ],
      },
      {
        // proxy.ts's middleware matcher excludes image extensions (no per-request nonce
        // needed there — perf), so those paths get no CSP from the block above. today
        // every upload goes to S3, so this is pre-emptive: if a user-uploaded SVG is
        // ever served from an app route, it still gets a maximally restrictive CSP
        // instead of none.
        source: '/:path*.(svg|png|jpg|jpeg|gif|webp)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'",
          },
        ],
      },
    ]
  },
}

export default nextConfig