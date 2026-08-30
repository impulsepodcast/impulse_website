import { createServer } from "node:http";
import { open, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

import { renderNotFoundPage } from "./lib/templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const publicDir = join(projectRoot, "public");
const clientDir = join(projectRoot, "dist", "client");
const episodesApiPath = join(publicDir, "data", "episodes.json");

function sendHtml(response: ServerResponse<IncomingMessage>, statusCode: number, html: string) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(html);
}

function sendJson(
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: unknown
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function contentTypeForPath(pathname: string): string {
  const extension = extname(pathname).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function cacheControlForPath(pathname: string): string {
  const extension = extname(pathname).toLowerCase();

  switch (extension) {
    case ".css":
    case ".js":
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".webp":
    case ".avif":
    case ".svg":
    case ".mp3":
    case ".wav":
      return "public, max-age=86400";
    case ".html":
    case ".json":
      return "no-cache";
    default:
      return "public, max-age=3600";
  }
}

async function serveFile(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  target: string,
  statusCode = 200
) {
  if (!existsSync(target)) {
    sendHtml(response, 404, renderNotFoundPage());
    return;
  }

  const rangeHeader = request.headers.range;

  if (rangeHeader) {
    const fileHandle = await open(target, "r");

    try {
      const stats = await fileHandle.stat();
      const size = stats.size;
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/i);

      if (!match) {
        response.writeHead(416, {
          "Content-Range": `bytes */${size}`
        });
        response.end();
        return;
      }

      const [, rawStart, rawEnd] = match;
      const suffixLength = rawStart === "" && rawEnd ? Number(rawEnd) : null;
      const start =
        suffixLength !== null ? Math.max(size - suffixLength, 0) : rawStart ? Number(rawStart) : 0;
      const end = suffixLength !== null ? size - 1 : rawEnd ? Number(rawEnd) : size - 1;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        (suffixLength !== null && suffixLength <= 0) ||
        start < 0 ||
        end < start ||
        start >= size
      ) {
        response.writeHead(416, {
          "Content-Range": `bytes */${size}`
        });
        response.end();
        return;
      }

      const safeEnd = Math.min(end, size - 1);
      const chunkSize = safeEnd - start + 1;
      const buffer = Buffer.alloc(chunkSize);

      await fileHandle.read(buffer, 0, chunkSize, start);
      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControlForPath(target),
        "Content-Length": chunkSize,
        "Content-Range": `bytes ${start}-${safeEnd}/${size}`,
        "Content-Type": contentTypeForPath(target)
      });
      response.end(buffer);
      return;
    } finally {
      await fileHandle.close();
    }
  }

  const content = await readFile(target);
  response.writeHead(statusCode, {
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControlForPath(target),
    "Content-Type": contentTypeForPath(target)
  });
  response.end(content);
}

async function serveStatic(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  pathname: string
) {
  const generatedTarget = join(publicDir, pathname.replace(/^\/+/, ""));
  const sourceTarget = join(publicDir, pathname.replace("/static/", ""));
  const target =
    pathname.startsWith("/static/client/")
      ? join(clientDir, pathname.replace("/static/client/", ""))
      : existsSync(generatedTarget)
        ? generatedTarget
        : sourceTarget;

  await serveFile(request, response, target);
}

function pagePathnameToFile(pathname: string): string {
  if (pathname === "/") {
    return join(publicDir, "index.html");
  }

  return join(publicDir, pathname.replace(/^\/+/, ""), "index.html");
}

function publicPathnameToFile(pathname: string): string {
  if (pathname === "/") {
    return join(publicDir, "index.html");
  }

  return join(publicDir, pathname.replace(/^\/+/, ""));
}

const server = createServer(async (request, response) => {
  if (!request.url || !request.method) {
    sendJson(response, 400, { message: "Invalid request." });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname;

  try {
    if (pathname.startsWith("/static/")) {
      await serveStatic(request, response, pathname);
      return;
    }

    if (request.method === "GET" && pathname === "/api/episodes") {
      const contents = await readFile(episodesApiPath, "utf8");
      sendJson(response, 200, JSON.parse(contents));
      return;
    }

    if (request.method === "GET") {
      const directTarget = publicPathnameToFile(pathname);
      if (extname(directTarget) && existsSync(directTarget)) {
        await serveFile(request, response, directTarget);
        return;
      }

      const targetPage = pagePathnameToFile(pathname);
      if (existsSync(targetPage)) {
        await serveFile(request, response, targetPage);
        return;
      }
    }

    await serveFile(request, response, join(publicDir, "404", "index.html"), 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    sendJson(response, 500, { message });
  }
});

const port = Number(process.env.PORT ?? 3000);

server.listen(port, () => {
  console.log(`Impulse site listening on http://localhost:${port}`);
});
