# AGENTS.md

Guidance for AI coding agents and human contributors working in this
repository. Read this before making changes.

Workflow conventions — branches, pull requests, task references, the version
scheme — live in [laugga/ops](https://github.com/laugga/ops), which serves
every repository. This file covers *this* repository: how to build it, how it
is laid out, where its content lives and how it deploys.

## Its Components row

The row is *laugga-web* — Kind *Website*, Platform *Web*, in the Laugga
Domain, Display Name *Laugga*. It is the Practice website, served at
[laug.ga](https://laug.ga). Its tasks are `LAU-###`.

It was laid out from [laugga/template-web](https://github.com/laugga/template-web)
in place (LAU-12), so the history before that commit is the previous site's.
`template-web`'s own `AGENTS.md` is the reference for anything here that
follows it unchanged: the `Makefile`, CI, the deploy workflow and
`scripts/version/`.

## What this is

A static [Astro](https://astro.build) site: one page of exercises, a 404 page,
one layout.

- **Every page is prerendered** into `dist/`. There is no server, no adapter
  and no rendering at request time.
- **No JavaScript ships.** Nothing here needs any; `tests/build.test.ts` fails
  if a page carries a `<script>` or `dist/_astro/` a `.js` file. A site that
  adds an island adds the framework with it, and says so in its pull request.
- **`astro.config.mjs` is Astro's defaults plus `site`**, which is
  `https://laug.ga`.
- **There is no CMS.** Content is Markdown and TypeScript in this repository,
  changed by pull request like everything else.

## Build and test

```bash
make build      # astro build, into dist/
make test       # vitest, over the built site
make lint       # astro check
make clean      # dist/ and Astro's caches
make dev        # http://localhost:4321
make preview    # serve dist/ exactly as it was built
make version    # the lane, version, build number and full version
make deploy     # the try-it build: a Hosting preview channel (Deployment)
```

`make build` installs dependencies first on a fresh clone — `node_modules` is
a Make target that runs `npm ci` — and then runs `astro build`. Node 22.12 or
newer; `.nvmrc` names 24, which is what CI runs.

`make test` runs vitest over `tests/`, and those tests read `dist/`. So the
Makefile makes `dist/index.html` a real target rather than a phony one: `make
build && make test` — what CI runs — builds exactly once, and `make test` on a
fresh clone still builds first. `tests/build.test.ts` checks the built output:

- every route in its `ROUTES` list is there, `public/` was copied through, no
  page links to a route that was not built, and `firebase.json` publishes the
  directory all of that was built into. **Add a page's route to `ROUTES` with
  the page**
- the home page has one item per exercise in `src/content/exercise/`, newest
  `date` first: the Vimeo player, with its parameters, when the exercise has a
  `video_url`, and its image with its `alt` otherwise
- every page's `<head>` carries the title, description, keywords, `og:` and
  `twitter:` tags from `src/data/seo.ts`, and the favicon
- no JavaScript ships

`make lint` is `astro check`: TypeScript and Astro diagnostics across every
`.astro` and `.ts` file, and the content collection's schema. It is part of
CI and is expected to report zero errors, zero warnings and zero hints.
`@types/node` is a dev dependency for its sake — the tests read `dist/` with
Node's own modules, and nothing else here brings their types.

## Content

**An exercise is a folder**, `src/content/exercise/<slug>/`, holding an
`index.md` and the image it names. The folder's name is the exercise's id. The
`index.md` is frontmatter only:

```yaml
---
title: myorun watch regularity
image: myorun-watch-regularity.png
alt: myotest regularity graph changes
video_url: https://player.vimeo.com/video/821430576?h=66d4428382
date: 2023-04-26T20:35:01.398Z
---
```

| Field | |
|---|---|
| `title` | The exercise's name. The video player's `title` |
| `image` | A file name in the exercise's own folder. Required, even with a video |
| `alt` | The image's alt text |
| `description` | Optional. Nothing shows it yet |
| `video_url` | Optional. A Vimeo player URL; when it is set, the home page shows the video in place of the image |
| `date` | Its place on the home page: newest first |

`src/content.config.ts` is the schema. A missing field or a `video_url` that
is not a URL fails `make lint` and `make build`; an `image` that is not in the
folder fails `make build`. Neither gets as far as a page. Images go through `astro:assets`: the home page
serves each at 250px wide, as WebP with a PNG fallback, at 63, 125 and 250
pixels.

**What every page's `<head>` says about the site** — its name, title,
description and keywords — is `src/data/seo.ts`. The favicon is
`public/laugga-icon.png`.

## Continuous integration

`.github/workflows/ci.yml` gates every pull request into `main` and `dev`,
and runs on a pushed tag. On `ubuntu-latest` it installs the Node version
`.nvmrc` names, then runs `make build`, `make test` and `make lint`. It is
`template-web`'s, unchanged.

The check is named **`Build and test`**, the name every other Laugga gate
reports, and the one the repository's *Require CI* ruleset requires. It is the
only job in the file on purpose: every job that runs on a pull request reports
there as a check of its own.

`.github/workflows/deploy.yml` is the other workflow, and it is not a gate: it
publishes `dev` after a merge, and never runs on a pull request (*Deployment*,
below).

## Layout

| Path | What it is |
|---|---|
| `astro.config.mjs` | Astro's configuration — its own required file and name |
| `src/pages/` | One file per route, named after its URL: `/` and `/404.html` |
| `src/layouts/` | The page shell every page is wrapped in, and its `<head>` |
| `src/components/` | Astro components, `UpperCamelCase.astro`: the header, the footer, the Vimeo player |
| `src/content/exercise/` | The exercises, one folder each (*Content*) |
| `src/content.config.ts` | The exercises' schema — Astro's own required file and name |
| `src/data/` | Site-wide values: `seo.ts` |
| `src/assets/` | Images the components import: the logo |
| `src/styles/` | The site's global CSS: `normalize.css`, then `global.css` |
| `public/` | Served as it is: `robots.txt`, the favicon |
| `tests/` | vitest suites, run against `dist/` by `make test` |
| `scripts/version/` | `version.sh`, vendored from `laugga/ops` (*Versioning*) |
| `firebase.json` | What Firebase Hosting publishes, `dist/`, and how it caches it |
| `.firebaserc` | The Firebase projects, by name: `default`, `development`, `production` |
| `.github/workflows/` | `ci.yml`, the merge gate, and `deploy.yml`, the deploy of `dev` |
| `Makefile` | The uniform interface: `build`, `test`, `lint`, `clean`, `deploy`, `deploy-development` |

Lowercase directories throughout: they are Astro's own names, and its
convention wins over the organisation's default (`CONVENTIONS.md` → *Web
(Astro)*). `scripts/` is plural, as `CONVENTIONS.md` leaves a repository free
to choose.

The two typefaces, Montserrat for headings and Merriweather for the body, are
npm packages (`@fontsource-variable/montserrat`, `@fontsource/merriweather`)
that `src/layouts/Layout.astro` imports, so they are served from `dist/` with
everything else.

## Deployment

Two deploys, and both go to Firebase Hosting in **`laugga-development`**
(project number `656901280286`), the Laugga Domain's Development project
(`CONVENTIONS.md` → *Firebase projects*). A pull request gets a preview from
the agent, and a merge into `dev` is published by a workflow. Neither is
production.

| | `make deploy` | `make deploy-development` |
|---|---|---|
| What it is | the try-it build `CONVENTIONS.md` describes for a website: a Hosting **preview channel**, a complete copy of the site on its own URL. It is not what the project's own site serves, and nothing indexes it | the integration lane: the Hosting site itself, which serves the latest `dev` |
| URL | `https://laugga-development--<channel>-<hash>.web.app`, printed as `Channel URL`. It is what goes in a pull request's `## Try it` section | `https://laugga-development.web.app` |
| Run by | the agent, with the host's `firebase` CLI: `implement-task` when it opens the pull request, `revise-pull-request` after every later push. **CI never runs it** | `.github/workflows/deploy.yml`, on every push to `dev`, which runs the same `firebase deploy --only hosting`. By hand, from `dev`, only when that run did not deploy |
| Lifetime | 30 days after the last deploy | until the next merge |

**One preview channel per task, not one per build.** `make deploy` names the
channel from the task id: the full version without its `+<sha>`, lowercased
and made URL-safe, so `LAU-12+a8d30ea` deploys to channel `lau-12`. A branch
with no task id in its name falls back to the branch name.

**Both targets refuse before they build anything**: on a dirty tree or
unpushed commits, which is `scripts/version/version.sh check-deployable`, and
on a host with no `firebase` CLI. So what is published is always a commit that
exists on GitHub. **Push before deploying.**

| | |
|---|---|
| Destination configuration | `FIREBASE_PROJECT` in the root `Makefile`, and `hosting` in `firebase.json`. Neither names a Hosting site — this is the Laugga Domain's own website — so a deploy goes to the default site of the project it is given. Nothing in the site loads the Firebase SDK, so there is no web config to commit |
| Host setup | `npm i -g firebase-tools` and `firebase login`, once, as an account that can deploy Hosting in `laugga-development` |
| The workflow's CLI | `firebase-tools` at the version `deploy.yml` pins, installed on the runner by the run itself, because this repository has no copy of its own |
| How the workflow signs in | Workload Identity Federation, as the service account `github-deploy` of `laugga-development`. No secret, and no key |

`.firebaserc` names the projects. `default` and `development` are
`laugga-development`, so a `firebase` command given no `--project` never
reaches production, and `deploy.yml` deploys to `development` by that name.
`production` is **`laugga-45434`**, which serves laug.ga — a named exception
to the Domain's project naming (OPS-72).

**Production is a separate act:** `firebase deploy --only hosting --project
production`, from `main`, by a person. Neither target does it, no workflow
does, and no agent should.

### How the deploy workflow signs in

**It stores no credential and reads no secret.** Its
`google-github-actions/auth` step hands the run's own GitHub OIDC token to the
provider `github` in `laugga-development`, and gets back a short-lived
credential as the service account `github-deploy`, which `firebase` reads from
`GOOGLE_APPLICATION_CREDENTIALS`. The step sits after the build and directly
before the deploy, so `npm ci`'s install scripts and the build never run with
the credential.

The two values it signs in with are the only lines of `deploy.yml` that differ
from `template-web`'s:

| Line | Value |
|---|---|
| `WORKLOAD_IDENTITY_PROVIDER` | `projects/656901280286/locations/global/workloadIdentityPools/github/providers/github` |
| `SERVICE_ACCOUNT` | `github-deploy@laugga-development.iam.gserviceaccount.com` |

**That sign-in cannot be tried before a merge.** The provider accepts a token
only from a run on `dev`, in the `laugga` organisation. So the Deploy run of a
merge is the first place a change to the workflow shows, and a sign-in or a
deploy that is refused there is fixed on Google's side: the provider's
condition, the service account's role, or this repository's binding to it.

**The deploy is a workflow of its own, triggered by a push to `dev` and
nothing else.** Every job that runs on a pull request reports there as a check
of its own, and the *Require CI* ruleset is derived from the checks pull
requests report. That is why it is not a job in `ci.yml`, and why it has no
`pull_request` or `workflow_dispatch` trigger. Do not add one to try it.

### What has to exist on Google's side

In `laugga-development`: the identity pool and OIDC provider `github`, the
service account `github-deploy` holding Firebase Hosting Admin, and **one
binding that lets `laugga/laugga-web` act as it**. A person makes them with
`gcloud`; `template-web`'s `AGENTS.md` → *What has to exist on Google's side*
has every command. The binding for this repository is:

```bash
gcloud iam service-accounts add-iam-policy-binding github-deploy@laugga-development.iam.gserviceaccount.com --project laugga-development --role roles/iam.workloadIdentityUser --member "principalSet://iam.googleapis.com/projects/656901280286/locations/global/workloadIdentityPools/github/attribute.repository/laugga/laugga-web"
```

`host/firebase-app.sh plan <checkout> laugga-web`, in `laugga/ops`, reads both
ends. Unless it reads the provider and the binding to exist, it prints the
commands that make them. Until they do, a merge into `dev` is not deployed.

## Versioning

`scripts/version/` is vendored from `share/version/` in `laugga/ops`,
unchanged. **Edit it there, never here.** A copy that differs is what
`repo-doctor` looks for, and it flags one that is missing a file too, which is
why `write-ios-version.sh` is present in a repository with no iOS app in it.

The `Makefile` exports `VERSION_TASK_PREFIXES`, the task id prefixes
`version.sh` looks for in a branch name: `LAU LM OPS`, this board's first.
Without it, a working branch here would have the whole branch name as its full
version, and so as its preview channel.

There are no tags. Per `CONVENTIONS.md`, a web repository adopts the tagging
scheme when it first cuts a release, not before — so the version is `0.0.0`
and the lane is what carries meaning. `make version` prints all of it.
