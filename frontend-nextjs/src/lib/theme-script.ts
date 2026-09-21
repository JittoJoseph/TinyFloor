export const THEME_KEY = "tf-theme";

/**
 * Runs before first paint (inlined by the app layout), so the page never
 * flashes the wrong theme. Kept as a string because it cannot import anything.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.add("app");c.toggle("dark",d)}catch(e){document.documentElement.classList.add("app")}`;
