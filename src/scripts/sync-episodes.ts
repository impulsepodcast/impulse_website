import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { syncEpisodeCatalog } from "../lib/catalog.js";
import { renderAboutPage, renderEpisodePage, renderEpisodesPage, renderHomePage, renderNotFoundPage } from "../lib/templates.js";
import type { Episode } from "../lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

async function ensureDirectory(pathname: string): Promise<void> {
  await mkdir(pathname, { recursive: true });
}

async function writeTextFile(pathname: string, content: string): Promise<void> {
  await ensureDirectory(dirname(pathname));
  await writeFile(pathname, content, "utf8");
}

async function writeJsonFile(pathname: string, payload: unknown): Promise<void> {
  await writeTextFile(pathname, JSON.stringify(payload, null, 2));
}

async function copyClientBundleFile(fromPath: string, toPath: string): Promise<void> {
  await ensureDirectory(dirname(toPath));
  await copyFile(fromPath, toPath);
}

async function copyDirectoryContents(fromPath: string, toPath: string): Promise<void> {
  await rm(toPath, { recursive: true, force: true });
  await ensureDirectory(dirname(toPath));
  await cp(fromPath, toPath, { recursive: true });
}

function buildTags(episodes: Episode[]): string[] {
  const tags = new Set<string>();

  for (const episode of episodes) {
    for (const tag of episode.tags) {
      tags.add(tag);
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

async function removeGeneratedPublicFiles(publicPath: string): Promise<void> {
  await Promise.all([
    rm(join(publicPath, "about"), { recursive: true, force: true }),
    rm(join(publicPath, "data"), { recursive: true, force: true }),
    rm(join(publicPath, "episodes"), { recursive: true, force: true }),
    rm(join(publicPath, "404"), { recursive: true, force: true }),
    rm(join(publicPath, "404.html"), { force: true }),
    rm(join(publicPath, ".nojekyll"), { force: true }),
    rm(join(publicPath, "static"), { recursive: true, force: true }),
    rm(join(publicPath, "index.html"), { force: true }),
    rm(join(publicPath, "index.json"), { force: true })
  ]);
}

async function main() {
  const sourcePublicPath = join(projectRoot, "public");
  const outputPublicPath = sourcePublicPath;
  const clientPublicPath = join(outputPublicPath, "static", "client");
  const notFoundHtml = renderNotFoundPage();
  const syncedEpisodes = await syncEpisodeCatalog({
    dataFilePath: join(projectRoot, "data", "episodes.json"),
    markdownEpisodesDir: join(projectRoot, "content", "episodes")
  });
  const episodes = syncedEpisodes;
  const tags = buildTags(episodes);

  await removeGeneratedPublicFiles(outputPublicPath);

  await Promise.all([
    writeJsonFile(join(projectRoot, "data", "episodes.json"), {
      importedAt: new Date().toISOString(),
      episodes
    }),
    writeTextFile(join(outputPublicPath, "index.html"), renderHomePage(episodes, tags)),
    writeJsonFile(join(outputPublicPath, "index.json"), {
      latestEpisode: episodes[0] ?? null,
      featuredEpisodes: episodes.slice(1, 5),
      tags
    }),
    writeTextFile(join(outputPublicPath, "about", "index.html"), renderAboutPage(episodes)),
    writeJsonFile(join(outputPublicPath, "about", "index.json"), {
      episodeCount: episodes.length
    }),
    writeTextFile(join(outputPublicPath, "episodes", "index.html"), renderEpisodesPage(episodes, tags)),
    writeJsonFile(join(outputPublicPath, "episodes", "index.json"), {
      episodes,
      tags
    }),
    writeTextFile(join(outputPublicPath, "404", "index.html"), notFoundHtml),
    writeTextFile(join(outputPublicPath, "404.html"), notFoundHtml),
    writeTextFile(join(outputPublicPath, ".nojekyll"), ""),
    copyClientBundleFile(join(sourcePublicPath, "styles.css"), join(outputPublicPath, "static", "styles.css")),
    copyDirectoryContents(join(sourcePublicPath, "images"), join(outputPublicPath, "static", "images")),
    copyDirectoryContents(join(sourcePublicPath, "audio"), join(outputPublicPath, "static", "audio")),
    copyDirectoryContents(join(sourcePublicPath, "vendor"), join(outputPublicPath, "static", "vendor")),
    copyClientBundleFile(join(projectRoot, "dist", "client", "player.js"), join(clientPublicPath, "player.js")),
    copyClientBundleFile(join(projectRoot, "dist", "client", "episodes.js"), join(clientPublicPath, "episodes.js")),
    writeJsonFile(join(outputPublicPath, "data", "episodes.json"), episodes),
    writeJsonFile(join(outputPublicPath, "data", "tags.json"), tags)
  ]);

  await Promise.all(
    episodes.map(async (episode) => {
      const relatedEpisodes = episodes.filter((entry) => entry.slug !== episode.slug).slice(0, 4);
      await Promise.all([
        writeTextFile(
          join(outputPublicPath, "episodes", episode.slug, "index.html"),
          renderEpisodePage(episode, episodes)
        ),
        writeJsonFile(join(outputPublicPath, "episodes", episode.slug, "index.json"), {
          episode,
          relatedEpisodes
        })
      ]);
    })
  );

  console.log(`Synced ${episodes.length} markdown episode(s) and generated static pages in public/.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
