/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Helps avoid OOM / worker spawn failures on memory‑constrained Windows dev machines
  experimental: {
    cpus: 1,
  },
  /**
   * When `NEXT_PUBLIC_API_URL` is unset, browser calls use same-origin `/api/...`
   * and Next forwards to the local FastAPI server (avoids CORS and strict browser
   * rules that often surface as "Failed to fetch" when talking to :8000 directly).
   */
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    const target = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
