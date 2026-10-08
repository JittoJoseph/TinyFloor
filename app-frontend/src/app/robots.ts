import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/site";

/**
 * The app's one page worth finding is the lobby; the rest is behind a sign-in
 * and says noindex (middleware.ts). Shared offices and invitations stay uncrawled.
 */
export default function robots(): MetadataRoute.Robots {
  // The preview app is for trying changes; only the real one gets indexed.
  if (new URL(APP_URL).hostname !== "app.tinyfloor.com") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const hidden = ["/office/", "/invite/", "/join", "/dashboard", "/account", "/admin", "/auth", "/create"];
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...hidden, ...hidden.map((path) => `/*${path}`)] },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
