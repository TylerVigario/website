import FadeIn from "./FadeIn";
import ServiceCards from "./ServiceCards";
import { services } from "@/lib/services";

export default function Services() {
  return (
    <section className="relative bg-surface py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <FadeIn className="mb-10 lg:mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl md:text-5xl">
            You know the cost upfront.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Transparent hourly rate, no retainers, no surprises. We&apos;ll scope it before we start
            &mdash; whether it&apos;s a full network buildout or just getting your WiFi working
            again.
          </p>
        </FadeIn>

        <ServiceCards services={services} />
      </div>
    </section>
  );
}
