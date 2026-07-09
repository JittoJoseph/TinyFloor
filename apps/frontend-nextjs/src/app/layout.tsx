import type { Metadata } from "next";
import { VT323, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

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
  metadataBase: new URL("https://spatialmeet-app.vercel.app"),
  title: {
    default: "SpatialMeet - Your Cozy Virtual Office",
    template: "%s | SpatialMeet",
  },
  description:
    "A virtual office that looks like a game. Walk around, talk to coworkers, and feel like a team again.",
  keywords: ["virtual office", "remote work", "spatial chat", "online collaboration", "virtual workspace", "metaverse office", "proximity chat"],
  authors: [{ name: "SpatialMeet Team" }],
  openGraph: {
    title: "SpatialMeet - Your Cozy Virtual Office",
    description: "A virtual office that looks like a game. Walk around, talk to coworkers, and feel like a team again.",
    url: "https://spatialmeet-app.vercel.app",
    siteName: "SpatialMeet",
    images: [
      {
        url: "/office.png",
        width: 1200,
        height: 630,
        alt: "SpatialMeet Virtual Office",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpatialMeet - Your Cozy Virtual Office",
    description: "A virtual office that looks like a game. Walk around, talk to coworkers, and feel like a team again.",
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
      </body>
    </html>
  );
}
