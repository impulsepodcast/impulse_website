# Impulse Website

This project keeps the custom TypeScript website, but the publishing workflow is now markdown-first:

- plain Node.js HTTP server
- server-rendered pages
- new episodes added through markdown files in [content/episodes](/Users/myceane/impulse_website/content/episodes)
- tag-based episode filtering
- sticky site listener for 2-minute preview extracts
- GitHub Actions CI
- GitHub Pages deployment workflow for testing
- Hetzner deployment workflow kept for the next step

## Publishing flow

To add an episode now:

1. Copy [content/episodes/_template.md](/Users/myceane/impulse_website/content/episodes/_template.md)
2. Rename it to something like `59-episode-title.md`
3. Fill the frontmatter fields exactly
4. Add the 2-minute preview audio file under [public/audio/previews](/Users/myceane/impulse_website/public/audio/previews)
5. Run `npm run build`

The build validates the markdown files and regenerates [data/episodes.json](/Users/myceane/impulse_website/data/episodes.json), which is the synced catalog the server uses.

## Markdown template

Each markdown file contains:

- episode number
- title
- guest
- company
- release date
- cover image URL
- summary
- tags
- per-platform links
- `previewAudio`

The markdown body below the frontmatter becomes the long-form episode notes on the episode page.

## YouTube transcripts

Episodes with a YouTube link can include a readable and downloadable transcript. Transcript source files live in `content/transcripts/` and use the episode slug as their filename.

The generated episode page:

- shows the transcript in a white, collapsible section that remains accessible to visitors and search engines
- identifies it as a cleaned YouTube-caption transcript
- offers the complete transcript as a `.txt` download

Hidden white-on-white text is intentionally not used because it is inaccessible and can be treated as deceptive SEO. Native `<details>` content keeps the page usable while leaving the transcript in the page HTML.

For a new YouTube episode:

1. Install `yt-dlp` once, for example with `pipx install yt-dlp`.
2. Fetch the English caption tracks:

```bash
npm run transcripts:fetch
```

3. De-duplicate YouTube's rolling captions, clean noise tokens, quality-check the result, and create the transcript files:

```bash
npm run transcripts:import
```

4. Review names, companies, and technical terms before publishing. Automatically generated captions can still contain recognition errors.

## Cloudflare R2 media storage

The project includes an optional R2 publishing path for source images, audio, documents, and transcript downloads. Local builds continue to work when R2 is not configured.

The current media library is far below Cloudflare R2's Standard-storage free-tier allowance. For production delivery, connect the bucket to a custom domain such as `assets.impulsepodcast.com`; Cloudflare's `r2.dev` address is intended for development and is rate-limited.

### One-time Cloudflare setup

1. Create a Standard R2 bucket named `impulse-media`.
2. Create an R2 API token with Object Read & Write access limited to that bucket.
3. Connect the bucket to the production asset domain, or temporarily enable its `r2.dev` URL for testing.
4. Copy `.env.r2.example` and export the real values in your shell or deployment secrets. Never commit credentials.

### Preview the upload

The upload command is a dry run unless `--apply` is supplied:

```bash
npm run r2:push
```

It prepares keys under:

- `static/images/`
- `static/audio/`
- `static/documents/`
- `static/transcripts/`

### Push to R2

After exporting `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_BASE_URL`:

```bash
npm run r2:push -- --apply
```

Build with the same public origin to make generated pages use R2 automatically:

```bash
R2_PUBLIC_BASE_URL=https://assets.impulsepodcast.com npm run build
```

Only media and downloadable documents move to R2. HTML, CSS, and browser scripts keep their existing hosting path.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Validate markdown episodes:

```bash
npm run validate:episodes
```

3. Build and sync the catalog:

```bash
npm run build
```

4. Start the site:

```bash
PORT=3000 npm start
```

5. Open:

- `http://localhost:3000/`
- `http://localhost:3000/episodes`
- `http://localhost:3000/about`

## Sticky preview listener

The sticky listener is rendered on every page.

- For markdown episodes, it plays the provided preview clip for up to 120 seconds.
- When the preview ends, the listener nudges visitors to continue on the streaming platforms.
- If a markdown episode has no preview clip, the player stays in CTA mode and still shows the available platform links.

## Testing on GitHub Pages

The repo now includes a dedicated GitHub Pages workflow at [.github/workflows/pages.yml](/Users/myceane/impulse_website/.github/workflows/pages.yml).

It:

- installs dependencies
- validates markdown episodes
- builds the site with a GitHub Pages base path
- uploads the generated `public/` folder as the Pages artifact

To use it:

1. Push to `main`, or run the workflow manually from the Actions tab.
2. In the repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.

The workflow automatically handles both:

- user or org Pages repos like `your-name.github.io`
- project Pages repos like `your-name.github.io/impulse_website`

The build now also emits:

- `public/404.html` for GitHub Pages custom 404 support
- `public/.nojekyll`
- `public/static/client/*.js` so the static Pages artifact includes the compiled browser scripts

## Hosting on Hetzner later

This still fits a standard Hetzner Ubuntu server well. The repo now includes first-run deploy templates in [deploy](/Users/myceane/impulse_website/deploy).

### 1. Prepare the server once

Install a current Node.js release and Nginx on the Hetzner box. Node 24 is what the workflows use.

Then run the bootstrap script on the server once:

```bash
DOMAIN=impulsepodcast.com TARGET_DIR=/var/www/impulse PORT=3000 ./deploy/bootstrap-hetzner.sh
```

This installs:

- a systemd unit from [deploy/impulse.service](/Users/myceane/impulse_website/deploy/impulse.service)
- an Nginx site from [deploy/nginx.impulse.conf](/Users/myceane/impulse_website/deploy/nginx.impulse.conf)

You can override:

- `DOMAIN`
- `TARGET_DIR`
- `PORT`
- `APP_USER`
- `APP_GROUP`
- `SERVICE_NAME`
- `NGINX_SITE_NAME`

If you leave `APP_USER` and `APP_GROUP` unset, the bootstrap script uses the current SSH user by default, which is usually the simplest setup for GitHub Actions deployments.

### 2. Copy the project manually if you are not using GitHub Actions yet

Upload the project folder to the server, for example into `/var/www/impulse`.
New run

### 3. Install and build once manually

```bash
cd /var/www/impulse
npm install
npm run build
```

### 4. Start the site

```bash
sudo systemctl restart impulse
```

### 5. Add HTTPS

After Nginx is in place, add TLS with Certbot or your preferred certificate setup.

## Simple manual deploy later

I added a hand-deploy path so you do not need to remember the full sequence later.

### 1. Build a deploy bundle on your machine

```bash
npm run package:deploy
```

This creates `impulse-deploy.tgz` in the project root.

### 2. Upload the bundle to the server

```bash
scp impulse-deploy.tgz your-user@your-server:/var/www/impulse/
```

### 3. Extract it on the server

```bash
ssh your-user@your-server
cd /var/www/impulse
tar -xzf impulse-deploy.tgz
```

### 4. Activate the release on the server

```bash
./deploy/remote-release.sh
```

That script installs production dependencies and restarts the `impulse` service for you.

## GitHub Actions

Three workflows are included:

- [.github/workflows/ci.yml](/Users/myceane/impulse_website/.github/workflows/ci.yml): installs dependencies, validates markdown episodes, and builds the site
- [.github/workflows/pages.yml](/Users/myceane/impulse_website/.github/workflows/pages.yml): builds the static site for GitHub Pages and deploys `public/`
- [.github/workflows/deploy.yml](/Users/myceane/impulse_website/.github/workflows/deploy.yml): manual Hetzner deployment workflow kept for the next step

For the Hetzner deployment workflow, set these repository secrets:

- `HETZNER_HOST`
- `HETZNER_USER`
- `HETZNER_SSH_KEY`
- `HETZNER_TARGET_DIR`

Optional secrets:

- `HETZNER_PORT`
- `HETZNER_SERVICE_NAME`
- `APP_PORT`

The deploy workflow expects a systemd service named `impulse`.

## Key files

- [src/lib/markdown-episodes.ts](/Users/myceane/impulse_website/src/lib/markdown-episodes.ts): markdown parser and episode loader
- [src/lib/catalog.ts](/Users/myceane/impulse_website/src/lib/catalog.ts): loads markdown episodes and syncs the catalog
- [src/server.ts](/Users/myceane/impulse_website/src/server.ts): Node server and routes
- [src/lib/templates.ts](/Users/myceane/impulse_website/src/lib/templates.ts): page rendering and sticky player markup
- [src/client/player.ts](/Users/myceane/impulse_website/src/client/player.ts): sticky preview listener behavior
- [src/client/episodes.ts](/Users/myceane/impulse_website/src/client/episodes.ts): tag filtering
- [public/styles.css](/Users/myceane/impulse_website/public/styles.css): visual design

## Notes

- [data/episodes.json](/Users/myceane/impulse_website/data/episodes.json) is generated content, not the primary authoring surface.
- New publishing work should happen in markdown files, not by editing HTML or JSON directly.
