#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(root, "music");
const sourceDir = path.join(root, "build", "lossless-originals");
const playlistPath = path.join(musicDir, "playlist.json");
const targetLufs = -14;
// AAC encoding can add substantial inter-sample overshoot. A -4 dBTP source
// ceiling keeps the measured AAC output safely below the -1 dBTP broadcast
// ceiling without materially changing the approximately -14 LUFS target.
const targetTruePeak = -4;
const targetLra = 9;
const minimumAcceptedLufs = -14.8;
const maximumAcceptedLufs = -13.2;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function lowerCaseKeys(value) {
  return Object.fromEntries(Object.entries(value || {}).map(([key, item]) => [key.toLowerCase(), item]));
}

async function probeTags(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format_tags", "-of", "json", file,
  ], { maxBuffer: 2_000_000 });
  return lowerCaseKeys(JSON.parse(stdout).format?.tags);
}

async function measure(file, requestedLufs = targetLufs, requestedTruePeak = targetTruePeak) {
  const { stderr } = await exec("ffmpeg", [
    "-hide_banner", "-nostats", "-i", file,
    "-af", `loudnorm=I=${requestedLufs}:TP=${requestedTruePeak}:LRA=${targetLra}:print_format=json`,
    "-f", "null", "-",
  ], { maxBuffer: 4_000_000 });
  const blocks = [...stderr.matchAll(/\{\s*"input_i"[\s\S]*?\}/g)];
  if (!blocks.length) throw new Error(`FFmpeg returned no loudness measurement for ${file}`);
  return JSON.parse(blocks.at(-1)[0]);
}

function buildFilter(measured, requestedLufs, requestedTruePeak) {
  const loudnorm = [
    `loudnorm=I=${requestedLufs}`,
    `TP=${requestedTruePeak}`,
    `LRA=${targetLra}`,
    `measured_I=${measured.input_i}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_TP=${measured.input_tp}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":");
  return `${loudnorm},aresample=48000`;
}

async function remaster(source, destination) {
  const temporary = `${destination}.remaster.tmp.m4a`;
  let requestedLufs = targetLufs;
  let requestedTruePeak = targetTruePeak;
  let result;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const measured = await measure(source, requestedLufs, requestedTruePeak);
    await exec("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", source,
      "-map", "0:a:0", "-map_metadata", "0", "-vn",
      "-af", buildFilter(measured, requestedLufs, requestedTruePeak),
      "-ar", "48000", "-ac", "2", "-c:a", "aac", "-b:a", "256k", temporary,
    ], { maxBuffer: 4_000_000 });
    await fs.rename(temporary, destination);
    const verified = await measure(destination);
    result = { lufs: Number(verified.input_i), truePeak: Number(verified.input_tp) };
    if (result.lufs >= minimumAcceptedLufs && result.lufs <= maximumAcceptedLufs && result.truePeak <= -1) return result;
    if (result.truePeak > -1) {
      requestedTruePeak = Math.max(-9, requestedTruePeak + (-1.5 - result.truePeak));
    }
    const loudnessCorrection = targetLufs - result.lufs;
    requestedLufs = Math.max(-16, Math.min(-12, requestedLufs + loudnessCorrection));
    if (loudnessCorrection > 0 && result.truePeak < -1.5) {
      const safePeakBoost = Math.min(loudnessCorrection, -1.25 - result.truePeak);
      requestedTruePeak = Math.min(-2, requestedTruePeak + safePeakBoost);
    }
  }
  return result;
}

function findSource(track, trackTags, sources) {
  const title = normalize(trackTags.title);
  const artist = normalize(trackTags.artist);
  let candidates = sources.filter(source => {
    const sourceTitle = normalize(source.tags.title);
    const sourceArtist = normalize(source.tags.artist);
    return title && sourceTitle === title && (!artist || !sourceArtist || sourceArtist === artist);
  });
  if (candidates.length === 1) return candidates[0];

  const localName = normalize(path.basename(track, path.extname(track)));
  candidates = sources.filter(source => {
    const sourceName = normalize(path.basename(source.name, path.extname(source.name)));
    return sourceName.includes(localName) || localName.includes(sourceName);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

async function main() {
  const checkOnly = process.argv.includes("--check-only");
  const resume = process.argv.includes("--resume");
  const limitIndex = process.argv.indexOf("--limit");
  const limit = limitIndex === -1 ? Infinity : Number(process.argv[limitIndex + 1]);
  const jobsIndex = process.argv.indexOf("--jobs");
  const jobs = jobsIndex === -1 ? 2 : Math.max(1, Number(process.argv[jobsIndex + 1]) || 1);
  const matchIndex = process.argv.indexOf("--match");
  const match = matchIndex === -1 ? "" : String(process.argv[matchIndex + 1] || "").toLowerCase();
  const playlist = JSON.parse(await fs.readFile(playlistPath, "utf8"));
  const tracks = playlist.filter(file => /\.m4a$/i.test(file));
  const sourceNames = (await fs.readdir(sourceDir)).filter(file => /\.flac$/i.test(file));
  const sources = [];
  for (const name of sourceNames) {
    const file = path.join(sourceDir, name);
    sources.push({ name, file, tags: await probeTags(file) });
  }

  const mappings = [];
  const unresolved = [];
  for (const track of tracks) {
    const destination = path.join(musicDir, track);
    const source = findSource(track, await probeTags(destination), sources);
    if (source) mappings.push({ track, destination, source });
    else unresolved.push(track);
  }
  if (unresolved.length) {
    throw new Error(`No unique lossless source for ${unresolved.length} track(s):\n${unresolved.join("\n")}`);
  }
  console.log(`Mapped ${mappings.length}/${tracks.length} AAC tracks to verified FLAC originals.`);
  if (checkOnly) return;

  let cursor = 0;
  const selected = mappings.filter(item => !match || item.track.toLowerCase().includes(match)).slice(0, limit);
  const results = [];
  async function worker() {
    while (cursor < selected.length) {
      const item = selected[cursor++];
      if (resume) {
        const existing = await measure(item.destination);
        const existingMetrics = { lufs: Number(existing.input_i), truePeak: Number(existing.input_tp) };
        if (existingMetrics.lufs >= minimumAcceptedLufs && existingMetrics.lufs <= maximumAcceptedLufs && existingMetrics.truePeak <= -1) {
          results.push({ track: item.track, ...existingMetrics, skipped: true });
          console.log(`[${results.length}/${selected.length}] ${item.track}: already verified at ${existingMetrics.lufs.toFixed(2)} LUFS, ${existingMetrics.truePeak.toFixed(2)} dBTP`);
          continue;
        }
      }
      const metrics = await remaster(item.source.file, item.destination);
      results.push({ track: item.track, ...metrics });
      console.log(`[${results.length}/${selected.length}] ${item.track}: ${metrics.lufs.toFixed(2)} LUFS, ${metrics.truePeak.toFixed(2)} dBTP`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, selected.length) }, worker));

  const outliers = results.filter(item => item.lufs < minimumAcceptedLufs || item.lufs > maximumAcceptedLufs || item.truePeak > -1);
  if (outliers.length) {
    throw new Error(`Verification failed for ${outliers.length} track(s):\n${JSON.stringify(outliers, null, 2)}`);
  }
  await fs.mkdir(path.join(root, "build"), { recursive: true });
  await fs.writeFile(path.join(root, "build", "remaster-report.json"), JSON.stringify({
    targetLufs,
    acceptedLufs: { minimum: minimumAcceptedLufs, maximum: maximumAcceptedLufs },
    maximumTruePeakDbtp: -1,
    tracks: results.length,
    results: results.sort((a, b) => a.track.localeCompare(b.track)),
  }, null, 2) + "\n");
  console.log(`Remastered and verified ${results.length} track(s).`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
