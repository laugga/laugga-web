// These read dist/, so `make build` runs first — the Makefile makes dist a
// real target so `make test` builds it if nothing has yet, and CI's
// `make build && make test` builds exactly once.
//
// What they guard is the built output, which is what a visitor gets: the
// pages that should be there are there, public/ was copied through, no page
// links into one that was not built, every exercise is on the home page, every
// page's <head> says what the site is, and no JavaScript ships.
import { describe, expect, it, beforeAll } from "vitest"
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { seo } from "../src/data/seo"

const ROOT = new URL("..", import.meta.url).pathname
const DIST = join(ROOT, "dist")
const EXERCISES = join(ROOT, "src/content/exercise")

beforeAll(() => {
  if (!existsSync(join(DIST, "index.html"))) {
    throw new Error("dist/ is not built — run `make build` (or `make test`, which does)")
  }
})

// Every route the site publishes. Add a page's route here with the page, so
// one that stops being built fails here rather than as a dead link somebody
// already has.
const ROUTES = ["/", "/404.html"]

// A route is built as a file of its own or as a directory's index, depending
// on the config's `build.format` — either is the page. One that names its
// .html file is that file.
const pageFor = (route: string) => {
  if (route === "/") return join(DIST, "index.html")
  if (route.endsWith(".html")) return join(DIST, route)
  const asFile = join(DIST, `${route.replace(/\/$/, "")}.html`)
  return existsSync(asFile) ? asFile : join(DIST, route, "index.html")
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return htmlFiles(path)
    return entry.name.endsWith(".html") ? [path] : []
  })
}

describe("routes", () => {
  it.each(ROUTES)("%s is built", (route) => {
    expect(existsSync(pageFor(route))).toBe(true)
  })

  it("the home page has a title", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8")
    expect(html).toMatch(/<title>[^<]+<\/title>/)
  })

  it.each(["robots.txt", "laugga-icon.png"])("%s is published from public/", (file) => {
    expect(existsSync(join(DIST, file))).toBe(true)
  })
})

describe("hosting", () => {
  // firebase.json says which directory a deploy publishes, and nothing else
  // reads it before one. Pointed anywhere but where the site is built, it
  // would publish a stale site or none, with every other test here passing.
  it("firebase.json publishes the directory the site is built into", () => {
    const { hosting } = JSON.parse(readFileSync(join(ROOT, "firebase.json"), "utf8"))
    expect(resolve(ROOT, hosting.public)).toBe(resolve(DIST))
  })
})

describe("links", () => {
  const internal = (html: string) =>
    [...html.matchAll(/href="(\/[^"#]*)"/g)]
      .map((m) => m[1])
      .filter((href) => !href.startsWith("//"))

  it("no page links to a route that was not built", () => {
    const dead: string[] = []
    let checked = 0
    for (const file of htmlFiles(DIST)) {
      for (const href of internal(readFileSync(file, "utf8"))) {
        checked++
        const asPage = pageFor(href)
        const asFile = join(DIST, href)
        const ok =
          existsSync(asPage) ||
          (existsSync(asFile) && statSync(asFile).isFile())
        if (!ok) dead.push(`${relative(DIST, file)} -> ${href}`)
      }
    }
    // Without this the test passes just as happily on markup it failed to
    // parse at all.
    expect(checked).toBeGreaterThan(0)
    expect(dead).toEqual([])
  })
})

// The few entities Astro writes into text and attribute values, undone so a
// test can compare what a visitor reads.
const decode = (text: string) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")

/** An exercise's frontmatter, enough to say what the home page should show. */
function exercise(slug: string) {
  const text = readFileSync(join(EXERCISES, slug, "index.md"), "utf8")
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ""
  const field = (name: string) => {
    const value = block.match(new RegExp(`^${name}:[ \\t]*(.*)$`, "m"))?.[1].trim()
    return value?.replace(/^(["'])(.*)\1$/, "$2")
  }
  return { slug, alt: field("alt"), videoUrl: field("video_url"), date: field("date") }
}

describe("exercises", () => {
  const exercises = readdirSync(EXERCISES)
    .filter((slug) => existsSync(join(EXERCISES, slug, "index.md")))
    .map(exercise)
    .sort((a, b) => Date.parse(b.date!) - Date.parse(a.date!))
  const items = () =>
    readFileSync(join(DIST, "index.html"), "utf8").split('<div class="item"').slice(1)

  it("the home page has one item per exercise", () => {
    expect(exercises.length).toBeGreaterThan(0)
    expect(items().length).toBe(exercises.length)
  })

  // Each item is a video when the exercise has one, its image otherwise, and
  // they come newest first.
  it.each(exercises.map((e, i) => ({ ...e, i })))(
    "item $i is $slug",
    ({ i, alt, videoUrl }) => {
      const item = items()[i]
      if (videoUrl) {
        const src = decode(item.match(/<iframe[^>]* src="([^"]+)"/)?.[1] ?? "")
        const url = new URL(src)
        expect(url.origin + url.pathname).toBe(new URL(videoUrl).origin + new URL(videoUrl).pathname)
        expect(url.searchParams.get("h")).toBe(new URL(videoUrl).searchParams.get("h"))
        expect(url.search).toContain("muted=1&loop=1&autoplay=1&autopause=1&background=0")
      } else {
        expect(item).not.toContain("<iframe")
        expect(decode(item.match(/<img[^>]* alt="([^"]*)"/)?.[1] ?? "")).toBe(alt)
      }
    },
  )
})

describe("head", () => {
  const meta = (html: string, attribute: string, name: string) =>
    decode(
      html.match(new RegExp(`<meta ${attribute}="${name}" content="([^"]*)"`))?.[1] ?? "",
    )

  // Listed before beforeAll runs, so an unbuilt dist/ lists nothing here and
  // fails there, with the message that says what to do.
  const pages = existsSync(DIST) ? htmlFiles(DIST).map((file) => relative(DIST, file)) : []

  it.each(pages)(
    "%s says what the site is",
    (page) => {
      const html = readFileSync(join(DIST, page), "utf8")
      expect(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "")).toBe(
        `${seo.siteName} – ${seo.title}`,
      )
      expect(meta(html, "name", "description")).toBe(seo.description)
      expect(meta(html, "name", "keywords")).toBe(seo.keywords)
      expect(meta(html, "property", "og:title")).toBe(seo.title)
      expect(meta(html, "property", "og:description")).toBe(seo.description)
      expect(meta(html, "name", "twitter:card")).toBe("summary_large_image")
      expect(meta(html, "name", "twitter:title")).toBe(seo.title)
      expect(meta(html, "name", "twitter:description")).toBe(seo.description)
      expect(html).toContain('<link rel="icon" href="/laugga-icon.png" type="image/png">')
    },
  )
})

describe("payload", () => {
  // The site is static on purpose. A script here means a component started
  // shipping one, which is a decision for a pull request to say out loud.
  it("ships no JavaScript", () => {
    const scripts = htmlFiles(DIST).filter((file) => /<script\b/.test(readFileSync(file, "utf8")))
    const js = readdirSync(join(DIST, "_astro")).filter((file) => file.endsWith(".js"))
    expect(scripts.map((file) => relative(DIST, file))).toEqual([])
    expect(js).toEqual([])
  })
})
