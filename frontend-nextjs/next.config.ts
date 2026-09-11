import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://spatialmeet.jittojoseph.xyz";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "spatialmeet-app.vercel.app" }],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
