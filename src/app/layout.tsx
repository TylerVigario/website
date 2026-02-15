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
  description: "Enterprise-grade IT services with independent-scale attention. Custom software, network engineering, and IT strategy for businesses in Fresno, CA and nationwide.",
  metadataBase: new URL("https://vigario.tech"),
  openGraph: {
    title: "Vigario Technology Solutions",
    description: "Enterprise-grade IT services with independent-scale attention. Custom software, network engineering, and IT strategy.",
    url: "https://vigario.tech",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  other: {
    "theme-color": "#0a0a0f",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
