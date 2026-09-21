import type { MetadataRoute } from "next";

/** For "add to home screen": the mark from scripts/make-icons.py, in its three shapes. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TinyFloor",
    short_name: "TinyFloor",
    description: "A virtual office you walk around in.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#1a1a18",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
