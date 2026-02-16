import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Vigario Technology Solutions",
  url: "https://tylervigario.com",
  telephone: "+1-559-900-1400",
  email: "tyler@tylervigario.com",
  founder: {
    "@type": "Person",
    name: "Tyler Vigario",
  },
  foundingDate: "2021",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Fresno",
    addressRegion: "CA",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "Fresno" },
    { "@type": "City", name: "Clovis" },
    { "@type": "City", name: "Madera" },
    { "@type": "City", name: "Visalia" },
    { "@type": "GeoShape", name: "Central Valley, CA" },
  ],
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
