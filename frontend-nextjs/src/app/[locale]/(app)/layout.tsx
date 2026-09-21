import { AppTheme } from "@/components/app/AppTheme";
import { THEME_SCRIPT } from "@/lib/theme-script";

/** Every signed-in screen and the lobby: the app's theme and face, not the landing pages'. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <AppTheme />
      {children}
    </>
  );
}
