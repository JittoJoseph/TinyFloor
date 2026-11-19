import { sitemap } from "@/lib/sitemap";

export const dynamic = "force-static";

export const GET = () => sitemap("guides");
