import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadMarkdownEpisodes } from "./markdown-episodes.js";
async function ensureParentDirectory(pathname) {
    await mkdir(dirname(pathname), { recursive: true });
}
export async function loadEpisodeCatalog(options) {
    return loadMarkdownEpisodes(options.markdownEpisodesDir);
}
export async function syncEpisodeCatalog(options) {
    const episodes = await loadEpisodeCatalog(options);
    const payload = {
        importedAt: new Date().toISOString(),
        episodes
    };
    await ensureParentDirectory(options.dataFilePath);
    await writeFile(options.dataFilePath, JSON.stringify(payload, null, 2));
    return episodes;
}
