const nextConfig = {
  output: "export",
  distDir: "out",
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

export default nextConfig;
