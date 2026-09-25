import { VT323, Nunito, Caveat, Geist } from "next/font/google";

const vt323 = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

// Only the Latin file is preloaded; the page's text in other scripts (a
// Russian page, a name with accents) fetches its own file when it's needed.
const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

// The app's face (docs/06-app-design.md). Not preloaded: only the app routes
// use it, so the landing pages never download it.
const geist = Geist({
  variable: "--font-app",
  subsets: ["latin", "latin-ext", "cyrillic"],
  preload: false,
});

// The handwriting on the landing page's notes and arrows.
const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500"],
});

/** Every face the site uses, as CSS variables on <body>. */
export const fontVariables = `${vt323.variable} ${nunito.variable} ${caveat.variable} ${geist.variable}`;
