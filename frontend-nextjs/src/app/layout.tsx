import "./globals.css";

/**
 * The real root is `[locale]/layout.tsx`: it knows the locale from the URL,
 * so every page can be rendered once at build time and served as a file. A
 * root layout above it can't know the locale without reading the request's
 * headers, which would make every page render on each visit. So this one
 * only passes through; `not-found.tsx` beside it covers paths outside a locale.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
