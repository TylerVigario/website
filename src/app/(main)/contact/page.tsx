import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import FadeIn from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get a free IT quote for your business. Call (559) 900-1400 or fill out our form — transparent pricing, no retainers, scope before we start.",
  alternates: {
    canonical: "https://tylervigario.com/contact",
  },
  openGraph: {
    title: "Contact Us | Vigario Technology Solutions",
    description:
      "Get a free IT quote for your business. Call (559) 900-1400 or fill out our form — transparent pricing, no retainers, scope before we start.",
    url: "https://tylervigario.com/contact",
    siteName: "Vigario Technology Solutions",
    locale: "en_US",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://tylervigario.com/contact#page",
  name: "Contact Vigario Technology Solutions",
  url: "https://tylervigario.com/contact",
  mainEntity: {
    "@type": "ProfessionalService",
    "@id": "https://tylervigario.com/#business",
    name: "Vigario Technology Solutions",
    telephone: "+1-559-900-1400",
    email: "tyler@tylervigario.com",
  },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="pt-32 pb-16 lg:pb-20 lg:pt-36">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Left — copy */}
            <FadeIn animation="fade-in-up" margin="0px">
              <div className="lg:py-4">
                <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-4xl lg:text-5xl">
                  Get a free quote
                </h1>
                <p className="mt-4 text-lg text-muted">
                  Tell us a bit about what you need and we&apos;ll get back to you
                  with a clear scope and honest estimate &mdash; free, before you
                  commit to anything.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                      <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                    </svg>
                    <span>Rather talk? <a href="tel:+15599001400" className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent">(559) 900-1400</a></span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
                      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                    </svg>
                    <span>Email: <a href="mailto:tyler@tylervigario.com" className="inline-block py-2.5 -my-2.5 font-medium text-foreground hover:text-accent">tyler@tylervigario.com</a></span>
                  </div>
                </div>

                <div className="mt-10 space-y-3 text-sm text-muted">
                  <div className="flex items-start gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>Transparent hourly rate &mdash; no retainers, no hidden fees</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>Scope and estimate before any work starts</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span>Fresno area on-site &mdash; remote available anywhere</span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Right — form */}
            <FadeIn animation="fade-in-scale" delay={0.1} margin="0px">
              <div className="rounded-2xl border border-border bg-surface-light p-6 sm:p-8">
                <ContactForm initialService={service} />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
