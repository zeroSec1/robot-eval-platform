// Downloads every video referenced by src/data/real-episodes.json into
// public/videos/ so the app serves them locally (demo works offline), then
// rewrites each episode's video.url to the local path. The original remote
// URL is preserved as video.sourceUrl. Safe to re-run: finished files are
// skipped, and an episode's URL is only rewritten after a verified download.
//
// Usage: node scripts/download-videos.mjs

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "src", "data", "real-episodes.json");
const OUT_ROOT = path.join(ROOT, "public", "videos");

const episodes = JSON.parse(fs.readFileSync(DATA, "utf8"));

// Unique remote URLs still needing download (episodes already localized keep sourceUrl).
const remoteOf = (e) => e.video?.sourceUrl ?? (e.video?.url?.startsWith("http") ? e.video.url : null);
const urls = [...new Set(episodes.map(remoteOf).filter(Boolean))];

function localRelPath(url) {
  // .../datasets/<org>/<repo>/resolve/main/videos/<rest...> → <org>-<repo>/<rest joined with _>
  // Kept as the primary pattern (rather than matching anything after
  // resolve/main/) so re-running this script doesn't recompute new local
  // paths for episodes downloaded under this exact layout already.
  const strict = url.match(/\/datasets\/([^/]+)\/([^/]+)\/resolve\/main\/videos\/(.+)$/);
  // RoboArena's layout nests video files under
  // evaluation_sessions/<session>/<arm>/ instead of videos/, so fall back to
  // matching anything after resolve/main/ for sources shaped like that.
  const loose = strict ? null : url.match(/\/datasets\/([^/]+)\/([^/]+)\/resolve\/main\/(.+)$/);
  const m = strict ?? loose;
  if (!m) return null;
  const [, org, repo, rest] = m;
  return path.join(`${org}-${repo}`, rest.replaceAll("/", "_"));
}

let done = 0;
for (const url of urls) {
  const rel = localRelPath(url);
  if (rel === null) {
    // Not a per-file HF resolve URL (e.g. a dataset-level archive link some
    // older episodes carry in sourceUrl even though video.url already
    // points at a local file from an earlier one-off extraction): nothing
    // to fetch here, so leave that episode's video field untouched instead
    // of crashing the whole run over one legacy source.
    console.log(`skip (not a per-file HF URL) ${url}`);
    done += 1;
    continue;
  }
  const dest = path.join(OUT_ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const head = await fetch(url, { method: "HEAD", redirect: "follow" });
  const expected = Number(head.headers.get("content-length") ?? 0);

  const already = fs.existsSync(dest) ? fs.statSync(dest).size : -1;
  if (already === expected && expected > 0) {
    console.log(`skip (complete) ${rel}`);
  } else {
    const t0 = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
    const tmp = dest + ".part";
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    const got = fs.statSync(tmp).size;
    if (expected > 0 && got !== expected) {
      fs.rmSync(tmp);
      throw new Error(`size mismatch for ${rel}: got ${got}, expected ${expected}`);
    }
    fs.renameSync(tmp, dest);
    console.log(
      `✓ ${(got / 1e6).toFixed(1).padStart(7)} MB in ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s  ${rel}`,
    );
  }

  // Point every episode using this remote URL at the local copy.
  const localUrl = "/videos/" + rel.split(path.sep).join("/");
  for (const e of episodes) {
    if (remoteOf(e) === url) {
      e.video.sourceUrl = url;
      e.video.url = localUrl;
    }
  }
  fs.writeFileSync(DATA, JSON.stringify(episodes, null, 2));
  done += 1;
  console.log(`   progress: ${done}/${urls.length} files`);
}

console.log(`\nAll ${urls.length} videos local under public/videos/ - episode JSON updated.`);
