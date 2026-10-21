import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
// `z` re-exported from astro:content is deprecated in Astro 7; this is the
// same zod, reached where it now lives.
import { z } from "astro/zod"

// One folder per exercise, src/content/exercise/<slug>/index.md, with its
// image beside it. The frontmatter is the previous site's, field for field —
// a CMS wrote it — so every file moved here unchanged. The entry's id is the
// folder's name.
const exercise = defineCollection({
  loader: glob({ pattern: "*/index.md", base: "./src/content/exercise" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // A file name in the exercise's own folder. `image()` resolves it, so a
      // name that is not there fails the build rather than the page.
      image: image(),
      alt: z.string(),
      description: z.string().optional(),
      // A Vimeo player URL. When it is set, the home page shows the video in
      // place of the image.
      video_url: z.url().optional(),
      date: z.coerce.date(),
    }),
})

export const collections = { exercise }
