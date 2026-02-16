import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Vigario Technology Solutions | IT Services in Fresno, CA",
  description: "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
  metadataBase: new URL("https://tylervigario.com"),
  alternates: {
    canonical: "https://tylervigario.com",
  },
  openGraph: {
    title: "Vigario Technology Solutions | IT Services in Fresno, CA",
    description: "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
    url: "https://tylervigario.com",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigario Technology Solutions | IT Services in Fresno, CA",
    description: "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
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
        className={`${geistSans.variable} font-sans antialiased overflow-x-hidden`}
      >
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-100 focus-visible:rounded-lg focus-visible:bg-accent focus-visible:px-4 focus-visible:py-3 focus-visible:text-white focus-visible:outline-none"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
