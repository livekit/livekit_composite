import "@/styles/globals.css";

import type { Metadata } from "next";
import { Public_Sans, Space_Grotesk } from "next/font/google";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "LiveKit Robot Dashboard",
  description: "A sample robot dashboard application built with LiveKit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.variable} ${spaceGrotesk.variable} bg-bg0 text-fg0 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
