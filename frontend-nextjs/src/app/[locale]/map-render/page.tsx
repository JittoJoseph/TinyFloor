import { notFound } from "next/navigation";
import { MapRender } from "./MapRender";

export const metadata = { robots: { index: false } };

/** Draws the whole floor once, for scripts/pictures.mjs to save as /floor.webp. Only in development. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <MapRender />;
}
