import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { loadMarkdownEpisodes } from "./markdown-episodes.js";
import type { Episode, EpisodeStoreFile } from "./types.js";

export interface CatalogOptions {
  dataFilePath: string;
  markdownEpisodesDir: string;
}

async function ensureParentDirectory(pathname: string): Promise<void> {
  await mkdir(dirname(pathname), { recursive: true });
}

export async function loadEpisodeCatalog(options: CatalogOptions): Promise<Episode[]> {
  return loadMarkdownEpisodes(options.markdownEpisodesDir);
}

export async function syncEpisodeCatalog(options: CatalogOptions): Promise<Episode[]> {
  const episodes = await loadEpisodeCatalog(options);
  const payload: EpisodeStoreFile = {
    importedAt: new Date().toISOString(),
    episodes
  };

  await ensureParentDirectory(options.dataFilePath);
  await writeFile(options.dataFilePath, JSON.stringify(payload, null, 2));

  return episodes;
}
