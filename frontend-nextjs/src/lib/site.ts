export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com";

/** TinyFloor's own pages elsewhere: the footer links them, and search engines read them as the same company. */
export const SOCIALS = {
  linkedin: "https://www.linkedin.com/company/tinyfloor",
  x: "https://x.com/tinyflooroffice",
} as const;
