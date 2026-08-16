/** The service catalog. Data only — the icons were inline JSX in the
 *  previous .tsx version, which is why this file needed React types to
 *  hold a list of strings. They now live as .astro components in
 *  src/components/icons/services/, keyed by `slug`. */
export interface ServiceItem {
  slug: string;
  title: string;
  desc: string;
}

export const services: ServiceItem[] = [
  {
    slug: "networking-wifi",
    title: "Networking & WiFi",
    desc: "Home routers to commercial wireless — we design, install, and troubleshoot networks that actually work. Switching, routing, firewalls, everything in between.",
  },
  {
    slug: "security-cameras",
    title: "Security & Cameras",
    desc: "Camera systems, access control, and security hardening. We'll set it up so you can check in from anywhere — and help you pass the audit when it comes.",
  },
  {
    slug: "low-voltage-cabling",
    title: "Low-Voltage Cabling",
    desc: "Structured cabling, cable runs, patch panels, and terminations for commercial and residential. Clean installs, properly labeled, and built to last.",
  },
  {
    slug: "computers-servers-cloud",
    title: "Computers, Servers & Cloud",
    desc: "Custom builds, repairs, and upgrades for desktops, laptops, and servers. Plus cloud migrations and infrastructure setup when you're ready to scale.",
  },
  {
    slug: "custom-software",
    title: "Custom Software",
    desc: "Apps, automations, and integrations built around how you actually work. POS systems, workflow tools, web platforms — if off-the-shelf doesn't cut it, we'll build what does.",
  },
  {
    slug: "it-strategy-support",
    title: "IT Strategy & Support",
    desc: "Not sure what you need? We'll help you figure it out. Technology roadmaps, vendor evaluation, and ongoing support from a team that already knows your setup.",
  },
];
