/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com'],
  },
    typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
