import type { Metadata } from "next";
import { VT323, Nunito } from "next/font/google";
import "./globals.css";

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
  title: "SpatialMeet - Your Cozy Virtual Office",
  description:
    "A virtual office that looks like a game. Walk around, talk to coworkers, and feel like a team again.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${vt323.variable} ${nunito.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
