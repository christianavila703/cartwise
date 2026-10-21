/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
      },
    ],
  },
  env: {
    IMG_URL: process.env.CLOUDINARY_URL || "",
  },
};

module.exports = nextConfig;
