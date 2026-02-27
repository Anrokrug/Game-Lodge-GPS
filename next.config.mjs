/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=*, camera=(), microphone=()",
          },
        ],
      },
    ]
  },
  webpack: (config) => {
    // Leaflet uses browser-only globals — tell webpack to ignore them on server
    config.resolve.alias = {
      ...config.resolve.alias,
      './images/marker-icon-2x.png': false,
      './images/marker-icon.png': false,
      './images/marker-shadow.png': false,
    }
    return config
  },
}

export default nextConfig
