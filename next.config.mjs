/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow larger request bodies for file uploads (up to 50MB via JSON)
  // Files larger than this should use Vercel Blob client-side upload
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
