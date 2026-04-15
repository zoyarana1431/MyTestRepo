/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Helps avoid OOM / worker spawn failures on memory‑constrained Windows dev machines
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
