export const THEME_KEY = "tf-theme";

/**
 * The first part of every app route, after the locale. The home page ("/")
 * shares the app's theme too; the other landing pages are everything else.
 */
export const APP_SECTIONS = ["dashboard", "office", "lobby", "auth", "create", "account", "invite", "join"];

/**
 * Runs before first paint (the root layout loads it with next/script's
 * beforeInteractive), so an app page never flashes the wrong theme. It only
 * touches app routes and the home page; on another landing page it does nothing, and AppTheme takes
 * over on client-side navigation. Kept as a string because it runs before any
 * bundle has loaded.
 */
export const THEME_SCRIPT = `try{var p=location.pathname.split("/").filter(Boolean);if(p[0]&&p[0].length===2)p.shift();if(!p[0]||${JSON.stringify(
  APP_SECTIONS,
)}.indexOf(p[0])>-1){var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.add("app");c.toggle("dark",d)}}catch(e){}`;
