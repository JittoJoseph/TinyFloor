import { VT323, Nunito, Geist } from "next/font/google";

const vt323 = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

// The default body face: the 404 page and the share images. The site's pages
// and the app are set in Geist now, so it isn't preloaded on every page.
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  preload: false,
});

// The app's face and the site's (docs/06-app-design.md). Not preloaded: it
// has three subsets, and preloading would fetch all three on every page.
const geist = Geist({
  variable: "--font-app",
  subsets: ["latin", "latin-ext", "cyrillic"],
  preload: false,
});

/** Every face the site uses, as CSS variables on <body>. */
export const fontVariables = `${vt323.variable} ${nunito.variable} ${geist.variable}`;
