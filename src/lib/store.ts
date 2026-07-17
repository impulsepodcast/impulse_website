import { readFile } from "fs/promises";

import type { Episode, EpisodeStoreFile } from "./types.js";
import { stableSortByNumberDesc } from "./utils.js";

interface StoreOptions {
  dataFilePath: string;
}

export async function createEpisodeStore(options: StoreOptions) {
  let cache: Episode[] | null = null;

  async function ensureEpisodes(): Promise<Episode[]> {
    if (cache !== null) {
      return cache;
    }

    const fileContents = await readFile(options.dataFilePath, "utf8");
    const parsed = JSON.parse(fileContents) as EpisodeStoreFile | Episode[];
    cache = stableSortByNumberDesc(Array.isArray(parsed) ? parsed : parsed.episodes);
    return cache;
  }

  return {
    async list(): Promise<Episode[]> {
      return stableSortByNumberDesc(await ensureEpisodes());
    },

    async findBySlug(slug: string): Promise<Episode | undefined> {
      const episodes = await ensureEpisodes();
      return episodes.find((episode) => episode.slug === slug);
    },

    async allTags(): Promise<string[]> {
      const episodes = await ensureEpisodes();
      const tags = new Set<string>();

      for (const episode of episodes) {
        for (const tag of episode.tags) {
          tags.add(tag);
        }
      }

      return [...tags].sort((left, right) => left.localeCompare(right));
    }
  };
}
