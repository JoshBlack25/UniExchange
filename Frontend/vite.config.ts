import { createHash } from 'node:crypto'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/*
  Public pages - the only ones a crawler can see without signing in. Keep in
  step with the routes in src/App.tsx that do NOT pass `noindex` to <Seo>.
*/
const PUBLIC_PATHS = ['/', '/login', '/signup']

/* App routes behind the login. robots.txt asks crawlers to stay out of them. */
const PRIVATE_PATHS = [
  '/feed',
  '/listings',
  '/profile',
  '/messages',
  '/notifications',
  '/bulletin',
  '/wallet',
  '/purchases',
  '/moderation',
  '/admin',
  '/verify',
]

function originOf(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function sitemapXml(siteUrl: string): string {
  const urls = PUBLIC_PATHS.map(
    (path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <changefreq>monthly</changefreq>\n  </url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function robotsTxt(siteUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

function llmsTxt(siteUrl: string): string {
  return `# UniExchange

> UniExchange is a verified marketplace for students and staff of the Cape Peninsula University of Technology (CPUT) in Cape Town, South Africa. Only people with a CPUT email address can join: students sign up with their student number @mycput.ac.za address and staff with their @cput.ac.za address, confirmed with a one-time code sent by email.

What members can do:

- Buy, sell and swap textbooks, tech, stationery and res items with other CPUT students and staff, browsing by campus and category.
- Chat with a seller about a listing, including photos, videos and voice notes.
- Pay from an in-app wallet topped up through PayFast. Wallet purchases are held in escrow and released to the seller only once the buyer confirms they received the item; either side can cancel before then and the buyer is refunded in full.
- Post and read the campus bulletin: events, study groups, lost and found and general notices.
- Review a seller after a completed deal. Sellers with a run of well-rated sales to different buyers earn a Trusted Seller badge.
- Report listings, posts and users. Moderators review reports and can remove content or suspend accounts.

Everything except the pages below requires signing in, and is not meant to be indexed.

## Public pages

- [Home](${siteUrl}/): what UniExchange is, how it works, safety and FAQ
- [Sign up](${siteUrl}/signup): create an account with a CPUT email address
- [Log in](${siteUrl}/login): sign in to an existing account

## Related

- [Cape Peninsula University of Technology](https://www.cput.ac.za)
`
}

/*
  SEO + security for the static build, all driven by env vars:

  - writes sitemap.xml, robots.txt and llms.txt into dist/ for VITE_SITE_URL
    (and serves the same files from the dev server)
  - replaces %SITE_URL% in index.html (absolute og:image for link previews)
  - build only: adds a Content-Security-Policy <meta> whose script-src carries
    the sha256 of the inline theme script, computed from the final HTML so an
    edit to that script can never silently break it. Dev is left alone: Vite's
    HMR client and React refresh need inline scripts and a websocket.

  The API origin (VITE_API_BASE_URL) is allowed for fetches, images (listing
  photos, profile photos) and media (chat voice notes and videos).
*/
function seoAndSecurity(siteUrl: string, apiOrigin: string | null, command: 'build' | 'serve'): Plugin {
  const files: Record<string, { type: string; body: string }> = {
    'sitemap.xml': { type: 'application/xml; charset=utf-8', body: sitemapXml(siteUrl) },
    'robots.txt': { type: 'text/plain; charset=utf-8', body: robotsTxt(siteUrl) },
    'llms.txt': { type: 'text/plain; charset=utf-8', body: llmsTxt(siteUrl) },
  }

  return {
    name: 'uniexchange-seo-security',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[(req.url ?? '').split('?')[0].replace(/^\//, '')]
        if (!file) return next()
        res.setHeader('Content-Type', file.type)
        res.end(file.body)
      })
    },

    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: file.body })
      }
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        html = html.replaceAll('%SITE_URL%', siteUrl)
        if (command !== 'build') return html

        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`,
        )
        const api = apiOrigin ? ` ${apiOrigin}` : ''

        /*
          frame-ancestors is not here on purpose: browsers ignore it (with a
          console warning) in a <meta> policy. Send it, with the rest of this
          policy, as a real HTTP header from the host when there is one.
        */
        const csp = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          // Tailwind output is a file, but React style={...} props and the
          // Google Fonts stylesheet still need these.
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          // https: because a bulletin post may carry a pasted image link.
          `img-src 'self' data: blob: https:${api}`,
          `media-src 'self' blob: mediastream:${api}`,
          `connect-src 'self'${api}`,
          "manifest-src 'self'",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          // PayFast top-ups POST a signed form to (sandbox|www).payfast.co.za.
          "form-action 'self' https://*.payfast.co.za",
        ].join('; ')

        return html.replace(
          /<meta charset="UTF-8" \/>/,
          (charset) => `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const devFallback = command === 'build' ? 'http://localhost:4173' : 'http://localhost:5173'
  if (command === 'build' && !env.VITE_SITE_URL) {
    console.warn(
      `\n[uniexchange] VITE_SITE_URL is not set - sitemap.xml, robots.txt, llms.txt and og:image will point at ${devFallback}.\n`,
    )
  }
  const siteUrl = (env.VITE_SITE_URL || devFallback).replace(/\/+$/, '')
  const apiOrigin = originOf(env.VITE_API_BASE_URL || 'http://localhost:8080')

  return {
    plugins: [react(), tailwindcss(), seoAndSecurity(siteUrl, apiOrigin, command)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      // Never ship source maps - they would publish the whole source tree.
      sourcemap: false,
      rolldownOptions: {
        output: {
          /*
            Vite 8 bundles with Rolldown, where codeSplitting.groups replaces
            Rollup's manualChunks. Long-lived vendor code gets its own chunks so
            an app deploy does not bust their cache. Higher priority wins a
            module first, so React never ends up inside the charts chunk.
          */
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 40 },
              { name: 'forms', test: /node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/, priority: 30 },
              { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/, priority: 30 },
              // Only the moderation analytics use recharts, and that is already lazy.
              { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/, priority: 20 },
            ],
          },
        },
      },
    },
    // No dev proxy needed: the backend already allows http://localhost:5173 as a
    // CORS origin (app.cors.allowed-origins), so the browser talks to it directly.
    server: {
      port: 5173,
      /*
        Fail loudly if 5173 is taken rather than quietly moving to 5174.

        A silent move breaks two things at once: the backend only allows
        http://localhost:5173 and :3000 as CORS origins, so every API call fails
        with an opaque console error, and .vscode/launch.json opens Chrome at a
        hard-coded :5173. An "address already in use" message is far easier to act
        on than either of those.
      */
      strictPort: true,
    },
  }
})
