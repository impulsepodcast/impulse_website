import { readFile } from "fs/promises";
import { stableSortByNumberDesc } from "./utils.js";
export async function createEpisodeStore(options) {
    let cache = null;
    async function ensureEpisodes() {
        if (cache !== null) {
            return cache;
        }
        const fileContents = await readFile(options.dataFilePath, "utf8");
        const parsed = JSON.parse(fileContents);
        cache = stableSortByNumberDesc(Array.isArray(parsed) ? parsed : parsed.episodes);
        return cache;
    }
    return {
        async list() {
            return stableSortByNumberDesc(await ensureEpisodes());
        },
        async findBySlug(slug) {
            const episodes = await ensureEpisodes();
            return episodes.find((episode) => episode.slug === slug);
        },
        async allTags() {
            const episodes = await ensureEpisodes();
            const tags = new Set();
            for (const episode of episodes) {
                for (const tag of episode.tags) {
                    tags.add(tag);
                }
            }
            return [...tags].sort((left, right) => left.localeCompare(right));
        }
    };
}
