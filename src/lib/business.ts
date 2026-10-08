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

/** The place a page's title names. The region rather than one city: the
 *  business is in Riverdale, on the Fresno-Kings county line, and works
 *  across the valley around it, not in Fresno alone. One value, so titles
 *  cannot drift page by page. */
export const SEARCH_PLACE = "the Central Valley";

/** Where the business works on site: about 90 minutes' drive from
 *  Riverdale in any direction. Measured 2026-10-07 as free-flow drive
 *  times from the town centre, so real driving runs a little longer;
 *  Delano and Merced, at 92 and 97 minutes, are left out. Remote work is
 *  not limited to these. */
export const areaServed = [
  // Fresno County
  city("Riverdale"),
  city("Laton"),
  city("Caruthers"),
  city("Selma"),
  city("Fowler"),
  city("Kingsburg"),
  city("Fresno"),
  city("Clovis"),
  city("Sanger"),
  city("Reedley"),
  city("Kerman"),
  city("Coalinga"),
  // Kings County
  city("Lemoore"),
  city("Hanford"),
  city("Corcoran"),
  city("Avenal"),
  city("Kettleman City"),
  // Tulare County
  city("Traver"),
  city("Dinuba"),
  city("Visalia"),
  city("Tulare"),
  city("Exeter"),
  city("Lindsay"),
  city("Porterville"),
  // Madera County
  city("Madera"),
  city("Chowchilla"),
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
