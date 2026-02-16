import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://tylervigario.com/#business",
  name: "Vigario Technology Solutions",
  description:
    "Local IT shop in Fresno, CA — networking, cameras, cabling, servers, and custom software. Full-stack tech help backed by 20+ years of hands-on experience.",
  url: "https://tylervigario.com",
  telephone: "+1-559-900-1400",
  email: "tyler@tylervigario.com",
  image: "https://tylervigario.com/images/vts-logo.png",
  founder: {
    "@type": "Person",
    name: "Tyler Vigario",
  },
  foundingDate: "2021",
  address: {
    "@type": "PostalAddress",
    streetAddress: "3318 W Tiger Ave",
    addressLocality: "Riverdale",
    addressRegion: "CA",
    postalCode: "93656",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 36.43,
    longitude: -119.86,
  },
  areaServed: [
    { "@type": "City", name: "Fresno" },
    { "@type": "City", name: "Clovis" },
    { "@type": "City", name: "Madera" },
    { "@type": "City", name: "Visalia" },
    { "@type": "City", name: "Riverdale" },
    { "@type": "GeoShape", name: "Central Valley, CA" },
  ],
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    opens: "07:00",
    closes: "22:00",
  },
  serviceType: [
    "Networking & WiFi",
    "Security & Cameras",
    "Low-Voltage Cabling",
    "Computer & Server Support",
    "Custom Software Development",
    "IT Strategy & Consulting",
  ],
  sameAs: [
    "https://github.com/tylervigario",
    "https://g.co/kgs/wyVQ2pD",
  ],
  priceRange: "$$",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main id="main">
        <Hero />
        <Services />
        <About />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
