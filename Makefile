# The uniform interface CONVENTIONS.md asks every typed repository for:
# `make build`, `make test`, `make lint`, `make clean` mean the same thing here
# as they do in a Swift package or a PlatformIO project. What is underneath is
# Astro and npm; see AGENTS.md.

NPM ?= npm
VERSION_SH := scripts/version/version.sh

# The task id prefixes version.sh looks for in a branch name, so that a working
# branch's full version is `LAU-12+<sha>` and not the whole branch name. LAU is
# this repository's board; LM and OPS are the script's own default.
export VERSION_TASK_PREFIXES := LAU LM OPS

# Where the two deploy targets publish: laugga-development, the Development
# project of the Laugga Domain, as host/firebase-app.sh apply in laugga/ops
# wrote it. No Hosting site is named, here or in firebase.json, so a deploy
# goes to the default site of the project it is given. Production, which serves
# laug.ga, is not deployed from here. AGENTS.md → Deployment.
FIREBASE_PROJECT := laugga-development
# How long a pull request's preview stays up after its last deploy: the most
# Hosting allows.
PREVIEW_EXPIRES  := 30d

.PHONY: all build test lint clean dev preview deploy deploy-development install version

all: build

# node_modules is a directory target so `make build` on a fresh clone installs
# first, and does nothing on every run after that.
node_modules: package.json package-lock.json
	$(NPM) ci
	@touch node_modules

install: node_modules

# dist is a real file target, not a phony one: `make build && make test` — what
# CI runs — then builds exactly once, and `make test` on its own still builds
# if nothing has yet.
SOURCES := $(shell find src public astro.config.mjs -type f 2>/dev/null)

dist/index.html: node_modules $(SOURCES)
	$(NPM) run build

build: dist/index.html

test: dist/index.html
	$(NPM) run test

lint: node_modules
	$(NPM) run check

clean:
	rm -rf dist .astro node_modules/.astro node_modules/.vite

dev: node_modules
	$(NPM) run dev

# Serve the built site exactly as it will be served, without deploying.
preview: dist/index.html
	$(NPM) run preview

version:
	@$(VERSION_SH)

# The try-it build CONVENTIONS.md's "UI surfaces only" section describes.
#
# A website's equivalent of an App Distribution build is a Firebase Hosting
# preview channel: a complete copy of the site on its own URL, expiring on its
# own, and not what the project's own site serves. One command, no arguments,
# and it refuses to run from a dirty tree or unpushed commits so the link in a
# pull request always points at a commit somebody can read.
#
# The channel is named after the task, not the commit: `LAU-12+a1b2c3d` deploys
# to `lau-12`. A later push replaces the build behind the same link.
#
# Every refusal comes before the build, which is why the build is a step of
# the recipe and not a prerequisite: Make would run a prerequisite first.
deploy:
	@case "$(FIREBASE_PROJECT)" in REPLACE-ME*|"") \
	  echo "FIREBASE_PROJECT is still the template's placeholder — a deploy needs the" >&2; \
	  echo "Development project of this repository's Domain. AGENTS.md → Deployment." >&2; \
	  exit 1 ;; esac
	@$(VERSION_SH) check-deployable
	@command -v firebase >/dev/null || { \
	  echo "firebase CLI not found — npm i -g firebase-tools, then firebase login" >&2; \
	  exit 1; \
	}
	@$(MAKE) --no-print-directory build
	@channel=$$($(VERSION_SH) full-version | sed -E 's/\+.*$$//' | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9-]+/-/g; s/^-+//; s/-+$$//' | cut -c1-40); \
	echo "deploying $$($(VERSION_SH) full-version) to preview channel $$channel"; \
	firebase hosting:channel:deploy "$$channel" \
	  --project $(FIREBASE_PROJECT) \
	  --expires $(PREVIEW_EXPIRES)

# The integration lane: what the Development project's own site serves.
# .github/workflows/deploy.yml runs the same deploy on every push to dev; this
# is that step by hand.
deploy-development:
	@case "$(FIREBASE_PROJECT)" in REPLACE-ME*|"") \
	  echo "FIREBASE_PROJECT is still the template's placeholder — a deploy needs the" >&2; \
	  echo "Development project of this repository's Domain. AGENTS.md → Deployment." >&2; \
	  exit 1 ;; esac
	@$(VERSION_SH) check-deployable
	@command -v firebase >/dev/null || { \
	  echo "firebase CLI not found — npm i -g firebase-tools, then firebase login" >&2; \
	  exit 1; \
	}
	@$(MAKE) --no-print-directory build
	firebase deploy --only hosting --project $(FIREBASE_PROJECT)
