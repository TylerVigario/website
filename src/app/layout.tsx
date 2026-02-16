import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vigario Technology Solutions",
  description: "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of experience.",
  metadataBase: new URL("https://vigario.tech"),
  openGraph: {
    title: "Vigario Technology Solutions",
    description: "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of experience.",
    url: "https://vigario.tech",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  other: {
    "theme-color": "#fafaf9",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`}
      >
        <a
          href="#services"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-3 focus:text-white focus:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
