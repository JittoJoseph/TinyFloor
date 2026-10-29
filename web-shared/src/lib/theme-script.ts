import { LANDINGS } from "./landings";
import { SESSION_HINT_KEY } from "./session-hint";

export const THEME_KEY = "tf-theme";

/**
 * The first part of every route that wears the app's theme, after the locale:
 * the app itself, and the marketing pages. The home page ("/") does too.
 */
const APP_SECTIONS = [
  "dashboard",
  "office",
  "lobby",
  "auth",
  "create",
  "account",
  "invite",
  "join",
  ...LANDINGS.map((page) => page.slug),
];

/**
 * Run in the head before the page paints: the theme, and `reveals`, which lets
 * the marketing pages hold back what's below the fold until it scrolls in
 * (marketing-frontend's globals.css). Without this script nothing is held back.
 */
export const THEME_SCRIPT = `try{document.documentElement.classList.add("reveals");var p=location.pathname.split("/").filter(Boolean);if(p[0]&&p[0].length===2)p.shift();if(!p[0]||${JSON.stringify(
  APP_SECTIONS,
)}.indexOf(p[0])>-1){var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.add("app");c.toggle("dark",d);if(localStorage.getItem("${SESSION_HINT_KEY}"))c.add("known")}}catch(e){}`;
