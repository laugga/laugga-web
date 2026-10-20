# laugga-web

The Practice website, [laug.ga](https://laug.ga): a grid of exercises — design
and interaction studies, each an image or a short video.

A static [Astro](https://astro.build) site, laid out the way `CONVENTIONS.md`
in [laugga/ops](https://github.com/laugga/ops) defines, from
[laugga/template-web](https://github.com/laugga/template-web). No JavaScript
ships, and there is no CMS: content is Markdown in this repository.

## Running it

```sh
make dev       # http://localhost:4321
make build     # static site into dist/
make test      # checks over the built output
make lint      # astro check
make preview   # serve dist/ exactly as it was built
make deploy    # a Firebase Hosting preview channel, for a pull request
```

`make dev` installs dependencies on a fresh clone. Node 22.12 or newer;
`.nvmrc` names 24, which is what CI runs.

## Where things are

```
src/
├── components/        Astro components: header, footer, the Vimeo player
├── content/exercise/  one folder per exercise: index.md and its image
├── data/              seo.ts, what every page's <head> says
├── layouts/           the page shell
├── pages/             routes: / and /404.html
└── styles/            normalize.css and global.css
public/                served as it is: robots.txt, the favicon
scripts/version/       vendored from laugga/ops — see AGENTS.md
tests/                 vitest
```

## Adding an exercise

Make a folder in `src/content/exercise/`, put the image in it, and write an
`index.md` beside it with `title`, `image`, `alt` and `date` — and
`video_url`, a Vimeo player URL, to show a video in place of the image.
`AGENTS.md` → *Content* has every field. Open a pull request: `make build`
fails on a field that is missing or wrong.

## Deploying

Every pull request into `main` or `dev` is gated by `Build and test`, which
builds the site, runs the tests and lints it. Every merge into `dev` is
published to `laugga-development` by `Deploy`. Production, `laugga-45434`, is
deployed by a person: `firebase deploy --only hosting --project production`,
from `main`.

`AGENTS.md` has the rest — what an agent needs to know to work here.
