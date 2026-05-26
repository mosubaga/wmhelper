/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/wmhelper',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
