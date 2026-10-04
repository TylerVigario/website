/**
 * The business and its founder, as every page's structured data refers
 * to them. One definition, so pages cannot describe the same business
 * differently: before this, the service area listed six places on the
 * home page, four on /services and five on /pots-migration.
 *
 * The full entities are defined once each, the business on the home page
 * and the person on /about. Everywhere else refers to them by @id.
 */

const california = { "@type": "State", name: "California" } as const;

const city = (name: string) => ({ "@type": "City", name, containedInPlace: california }) as const;

/** Where the business works on site. Remote work is not limited to these. */
export const areaServed = [
  city("Fresno"),
  city("Clovis"),
  city("Madera"),
  city("Visalia"),
  city("Riverdale"),
  { "@type": "Place", name: "Central Valley, CA", containedInPlace: california },
] as const;

/** A reference to the business entity defined on the home page. */
export const businessRef = (site: string) =>
  ({
    "@type": "ProfessionalService",
    "@id": `${site}/#business`,
    name: "Vigario Technology Solutions",
  }) as const;

/** A reference to the person defined on /about. */
export const founderRef = (site: string) =>
  ({ "@type": "Person", "@id": `${site}/about#person`, name: "Tyler Vigario" }) as const;
