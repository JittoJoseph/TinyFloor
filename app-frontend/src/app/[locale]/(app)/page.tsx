import { localizedMetadata } from "@/lib/seo";
import { AppHome } from "@/components/app/AppHome";

export const generateMetadata = localizedMetadata({
  path: "/",
  title: "dashboardTitle",
  noindex: true,
});

export default function AppHomePage() {
  return <AppHome />;
}
