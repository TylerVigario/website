/** The service catalog. Data only — the icons were inline JSX in the
 *  previous .tsx version, which is why this file needed React types to
 *  hold a list of strings. They now live as .astro components in
 *  src/components/icons/services/, keyed by `slug`. */
export interface ServiceItem {
  slug: string;
  /** Also the quote form's checkbox label and the value the schema
   *  accepts, so renaming one changes what a submission can say. */
  title: string;
  desc: string;
  /** The page that describes it. */
  href: string;
}

export const services: ServiceItem[] = [
  {
    slug: "websites-hosting",
    title: "Websites & Hosting",
    desc: "Custom sites built by hand and hosted on servers we own and run. Fast on a phone, found on Google, and never one platform price rise from a forced move.",
    href: "/services/websites",
  },
  {
    slug: "custom-software",
    title: "Custom Software",
    desc: "Field apps, business tools, integrations and automation, built around how you actually work. If off-the-shelf doesn't fit, we build what does.",
    href: "/services/software",
  },
  {
    slug: "managed-it",
    title: "Managed IT & Support",
    desc: "Remote management, backups verified before they leave the building, phones, email and planning. One team that already knows your setup and picks up.",
    href: "/services/managed-it",
  },
  {
    slug: "networking-wifi",
    title: "Networking & WiFi",
    desc: "Home routers to commercial wireless. Switching, routing, firewalls and structured cabling, designed, installed and documented.",
    href: "/services/networking",
  },
  {
    slug: "security-cameras",
    title: "Security & Cameras",
    desc: "Camera systems with local AI detection and no cloud subscription. Check in from anywhere, and keep the footage on hardware you own.",
    href: "/services/security-cameras",
  },
  {
    slug: "computers-servers",
    title: "Computers & Servers",
    desc: "Windows and Linux desktops and servers: builds, repairs, upgrades, Active Directory, Docker and the services you run on them.",
    href: "/services#systems",
  },
];
