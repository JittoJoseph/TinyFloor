export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tinyfloor.com";

/** TinyFloor's own pages elsewhere: the footer links them, and search engines read them as the same company. */
export const SOCIALS = {
  linkedin: "https://www.linkedin.com/company/tinyfloor",
  x: "https://x.com/tinyflooroffice",
  github: "https://github.com/JittoJoseph/TinyFloor",
} as const;

/** Who writes the guides; the byline links to LinkedIn. */
export const AUTHOR = {
  name: "Jitto Joseph",
  url: "https://www.jittojoseph.xyz",
  linkedin: "https://www.linkedin.com/in/jittojoseph17/",
  github: "https://github.com/JittoJoseph",
} as const;

/** Where people write to us: support, privacy, billing and refunds alike. */
export const SUPPORT_EMAIL = "support@tinyfloor.com";

/** The company's handle on X, for link cards there. */
export const X_HANDLE = "@tinyflooroffice";
