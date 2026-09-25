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

export const THEME_SCRIPT = `try{var p=location.pathname.split("/").filter(Boolean);if(p[0]&&p[0].length===2)p.shift();if(!p[0]||${JSON.stringify(
  APP_SECTIONS,
)}.indexOf(p[0])>-1){var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.add("app");c.toggle("dark",d);if(localStorage.getItem("${SESSION_HINT_KEY}"))c.add("known")}}catch(e){}`;
