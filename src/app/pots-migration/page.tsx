import type { Metadata } from "next";
import POTSLanding from "./POTSLanding";

export const metadata: Metadata = {
  title: "POTS to VoIP Migration | Stop Overpaying for Landline Service",
  description:
    "Still on AT&T or Verizon copper landlines? Your carrier is charging you 5-20x what modern VoIP costs. Free telecom audit for Central Valley businesses.",
  alternates: {
    canonical: "https://tylervigario.com/pots-migration",
  },
  openGraph: {
    title: "POTS to VoIP Migration | Stop Overpaying for Landline Service",
    description:
      "Still on AT&T or Verizon copper landlines? Your carrier is charging you 5-20x what modern VoIP costs. Free telecom audit for Central Valley businesses.",
    url: "https://tylervigario.com/pots-migration",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "POTS to VoIP Migration | Stop Overpaying for Landline Service",
    description:
      "Still on AT&T or Verizon copper landlines? Your carrier is charging you 5-20x what modern VoIP costs. Free telecom audit for Central Valley businesses.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://tylervigario.com/pots-migration#service",
  name: "POTS to VoIP Migration",
  description:
    "Telecom audit, VoIP migration, and carrier dispute advocacy for small businesses still on legacy copper landlines.",
  url: "https://tylervigario.com/pots-migration",
  provider: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
    name: "Vigario Technology Solutions",
    telephone: "+1-559-900-1400",
    email: "tyler@tylervigario.com",
    areaServed: [
      { "@type": "City", name: "Fresno" },
      { "@type": "City", name: "Clovis" },
      { "@type": "City", name: "Madera" },
      { "@type": "City", name: "Visalia" },
      { "@type": "GeoShape", name: "Central Valley, CA" },
    ],
  },
  serviceType: [
    "Telecom Audit",
    "VoIP Migration",
    "Carrier Dispute Advocacy",
    "POTS Line Replacement",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free telecom audit",
  },
};

export default function POTSMigrationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <POTSLanding />
    </>
  );
}
