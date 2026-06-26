/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages serveur à ne pas bundler (require dynamiques, binaires natifs).
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "music-metadata",
      "openai",
      "@supabase/supabase-js",
      "pdf-parse",
      "mammoth",
      "word-extractor",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'video.golpoai.com',
      },
    ],
  },
};

module.exports = nextConfig;
