import { defineConfig } from "astro/config"

// Astro's defaults, on purpose: every page is prerendered into dist/, with no
// adapter and no integration. A site adds what it needs here — its `site` URL,
// a sitemap, a framework for an island — and says why beside it.
export default defineConfig({})
