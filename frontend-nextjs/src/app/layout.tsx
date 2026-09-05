import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { VT323, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ClarityAnalytics } from "@/components/ClarityAnalytics";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const vt323 = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "./",
  },
  title: {
    default: "SpatialMeet - A Virtual Office You Can Walk Around",
    template: "%s | SpatialMeet",
  },
  description:
    "SpatialMeet is a free virtual office in your browser. Walk around a pixel-art floor with your team and start a video call just by standing next to someone.",
  keywords: [
    "virtual office",
    "remote work",
    "spatial chat",
    "online collaboration",
    "virtual workspace",
    "metaverse office",
    "proximity chat",
    "proximity video chat",
    "virtual coworking space",
    "browser video calls",
  ],
  authors: [{ name: "Jitto Joseph" }],
  creator: "Jitto Joseph",
  openGraph: {
    title: "SpatialMeet - A Virtual Office You Can Walk Around",
    description:
      "SpatialMeet is a free virtual office in your browser. Walk around a pixel-art floor with your team and start a video call just by standing next to someone.",
    url: SITE_URL,
    siteName: "SpatialMeet",
    images: [
      {
        url: "/office.png",
        width: 1200,
        height: 800,
        alt: "A SpatialMeet room: a 16-bit office floor with desks and teammates",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpatialMeet - A Virtual Office You Can Walk Around",
    description:
      "SpatialMeet is a free virtual office in your browser. Walk around a pixel-art floor with your team and start a video call just by standing next to someone.",
    images: ["/office.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${vt323.variable} ${nunito.variable} antialiased`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <GoogleAnalytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
