/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: '/site', destination: '/', permanent: true }]
  },
}

module.exports = nextConfig
