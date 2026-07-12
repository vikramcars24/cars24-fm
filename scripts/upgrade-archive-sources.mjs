#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(root, "music");
const playlistPath = path.join(musicDir, "playlist.json");
const downloadDir = path.join(root, "build", "lossless-originals");

function normalize(value) {
  return value.toLowerCase().replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

async function probe(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format_tags=title,comment", "-of", "json", file,
  ], { maxBuffer: 2_000_000 });
  return JSON.parse(stdout).format?.tags || {};
}

function pickFlac(localName, title, files) {
  const flacs = files.filter(file => /\.flac$/i.test(file.name || "") && file.source === "original");
  const track = localName.match(/ - (\d{2}) /);
  let candidates = track
    ? flacs.filter(file => new RegExp(`(?:^| - )${track[1]}(?: | -)`).test(file.name))
    : [];
  if (candidates.length !== 1) {
    const local = normalize(title || localName);
    candidates = flacs.filter(file => {
      const remote = normalize(file.name);
      return remote.includes(local) || local.includes(remote);
    });
  }
  return candidates.length === 1 ? candidates[0] : null;
}

async function download(url, destination) {
  try {
    const stat = await fs.stat(destination);
    if (stat.size > 0) return;
  } catch {}
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const playlist = JSON.parse(await fs.readFile(playlistPath, "utf8"));
  const upgraded = [];
  const unresolved = [];
  const tasks = [];
  const metadataCache = new Map();
  await fs.mkdir(downloadDir, { recursive: true });

  for (let index = 0; index < playlist.length; index++) {
    const localName = playlist[index];
    if (!/\.mp3$/i.test(localName)) continue;
    const localPath = path.join(musicDir, localName);
    const recoveredName = localName.replace(/\.mp3$/i, ".m4a");
    try {
      await fs.access(localPath);
    } catch {
      try {
        const stat = await fs.stat(path.join(musicDir, recoveredName));
        if (stat.size > 0) playlist[index] = recoveredName;
      } catch {}
      continue;
    }
    const tags = await probe(localPath);
    const identifier = String(tags.comment || "").match(/archive\.org\/details\/([^\s\r]+)/)?.[1];
    if (!identifier) continue;

    if (!metadataCache.has(identifier)) {
      const metadataResponse = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
      metadataCache.set(identifier, metadataResponse.ok ? await metadataResponse.json() : null);
    }
    const metadata = metadataCache.get(identifier);
    if (!metadata) continue;
    const source = pickFlac(localName, tags.title, metadata.files || []);
    if (!source) {
      unresolved.push({ localName, identifier });
      continue;
    }

    tasks.push({ index, localName, localPath, identifier, source });
  }

  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      const { index, localName, localPath, identifier, source } = task;
      const losslessPath = path.join(downloadDir, `${identifier}-${path.basename(source.name)}`);
      const nextName = localName.replace(/\.mp3$/i, ".m4a");
      const nextPath = path.join(musicDir, nextName);
      try {
        await download(`https://archive.org/download/${encodeURIComponent(identifier)}/${source.name.split("/").map(encodeURIComponent).join("/")}`, losslessPath);
        await exec("ffmpeg", [
          "-hide_banner", "-loglevel", "error", "-y", "-i", losslessPath,
          "-map", "0:a:0", "-vn",
          "-af", "loudnorm=I=-14:TP=-1:LRA=9,alimiter=limit=0.891251",
          "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "256k", nextPath,
        ], { maxBuffer: 2_000_000 });
        playlist[index] = nextName;
        await fs.rm(localPath);
        upgraded.push({ from: localName, to: nextName, identifier, source: source.name });
        console.log(`[${upgraded.length}/${tasks.length}] ${localName} -> ${nextName}`);
      } catch (error) {
        unresolved.push({ localName, identifier, error: error.message });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(12, tasks.length) }, worker));

  await fs.writeFile(playlistPath, JSON.stringify(playlist, null, 2) + "\n");
  await fs.writeFile(path.join(root, "build", "source-upgrade-report.json"), JSON.stringify({ upgraded, unresolved }, null, 2) + "\n");
  console.log(`Upgraded ${upgraded.length} track(s); ${unresolved.length} mapped item(s) lacked an unambiguous FLAC.`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
