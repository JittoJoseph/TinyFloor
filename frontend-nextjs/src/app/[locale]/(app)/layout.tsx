import { AppTheme } from "@/components/app/AppTheme";

/**
 * Every signed-in screen and the lobby: the app's theme and face, not the
 * landing pages'. The first paint is themed by the root layout's script;
 * AppTheme keeps it right on client-side navigation.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppTheme />
      {children}
    </>
  );
}
