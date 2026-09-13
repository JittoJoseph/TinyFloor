import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tinyfloor.com";

// Every host the site has lived on, or is reachable at, lands on one domain.
const OLD_HOSTS = [
  "www.tinyfloor.com",
  "spatialmeet.jittojoseph.xyz",
  "spatialmeet-app.vercel.app",
];

const nextConfig: NextConfig = {
  async redirects() {
    return OLD_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${siteUrl}/:path*`,
      permanent: true,
    }));
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
