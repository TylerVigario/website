# Vigario Technology Solutions — Website

Static landing page for Vigario Technology Solutions (B2B IT services). Built with Next.js 16, Tailwind CSS v4, Framer Motion, and TypeScript.

## Build

```bash
npm ci
npm run build
```

Output lands in `out/` — pure static HTML/CSS/JS. No Node server needed at runtime.

## Deployment (Server)

- OS: Fedora 43 headless
- Web server: Apache (httpd)
- The `out/` directory is the document root. Point Apache's `DocumentRoot` at it.
- The site is a single-page app with no dynamic routes — just `index.html` and static assets.
- `next.config.ts` has `output: "export"` which produces the static build.

### Deployment Pipeline

```
git push → post-receive git hook → triggers systemd service → runs admin deploy script
```

What needs to be set up on the server:

1. Clone the repo: `git clone https://github.com/TylerVigario/website.git`
2. Install Node (22+) and npm if not already present
3. **Bare repo + post-receive hook**: A bare git repo that receives pushes and triggers deployment
4. **systemd service**: A oneshot service that runs the deploy script (so it's logged, restartable, and trackable via `systemctl`)
5. **Deploy script**: `git pull` → `npm ci` → `npm run build` → sync `out/` to Apache's DocumentRoot
6. **Apache vhost**: Serve the built `out/` directory

### Apache Notes

- Static files only — no reverse proxy needed
- Enable gzip/brotli compression for performance
- Set cache headers for assets in `_next/static/` (they're content-hashed, cache forever)
- `fallback: false` in Next.js means no catch-all — Apache should serve files as-is

## Project Structure

```
src/
  app/
    layout.tsx       # Root layout, fonts, metadata
    page.tsx         # Page composition (Nav → Hero → Services → Trust → About → CTA → Footer)
    globals.css      # Tailwind theme, custom properties, global styles
  components/
    Nav.tsx          # Sticky nav, mobile hamburger, phone CTA
    Hero.tsx         # Full-viewport hero with headline + CTAs
    Services.tsx     # 6 service cards (3-col grid)
    Trust.tsx        # Credibility strip (4 stats)
    About.tsx        # Story + timeline (2-col)
    CTA.tsx          # Final call-to-action card
    Footer.tsx       # Contact info, copyright
```

## Domain

When DNS/SSL is ready, the domain is `vigario.tech`.
