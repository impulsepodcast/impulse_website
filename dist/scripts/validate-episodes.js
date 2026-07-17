import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { loadMarkdownEpisodes } from "../lib/markdown-episodes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");
async function main() {
    const markdownEpisodes = await loadMarkdownEpisodes(join(projectRoot, "content", "episodes"));
    for (const episode of markdownEpisodes) {
        if (!episode.image.startsWith("/static/")) {
            throw new Error(`Episode ${episode.number} must reference a local image in /static/, received: ${episode.image}`);
        }
        const imageAssetPath = join(projectRoot, "public", episode.image.replace("/static/", ""));
        await access(imageAssetPath);
        if (!episode.previewAudio) {
            throw new Error(`Episode ${episode.number} is missing a previewAudio file.`);
        }
        if (episode.previewAudio && episode.previewAudio.startsWith("/static/")) {
            const localAssetPath = join(projectRoot, "public", episode.previewAudio.replace("/static/", ""));
            await access(localAssetPath);
        }
    }
    console.log(`Validated ${markdownEpisodes.length} markdown episode file(s).`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
