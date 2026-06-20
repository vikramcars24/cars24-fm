#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const musicDir = path.join(root, "music");
const playlistPath = path.join(musicDir, "playlist.json");
const manifestPath = path.join(musicDir, "eleven_manifest.json");

const DEFAULT_PROMPTS = [
  { title: "Neon Rain Drive", prompt: "Cars24 FM original instrumental for night driving, warm rhodes chords, soft vinyl texture, mellow bass, elegant motion, no vocals" },
  { title: "Garage Blue Hour", prompt: "Cars24 FM original instrumental for focused building, gentle drums, dusky synths, calm confidence, no vocals" },
  { title: "Afterglow Cruise", prompt: "Cars24 FM original instrumental for late-evening driving, mellow electronic groove, tasteful ambient pads, no vocals" },
  { title: "Citylight Idle", prompt: "Cars24 FM original instrumental for thinking and driving, restrained beat, soft keys, subtle tape texture, no vocals" },
  { title: "Sunup Warm Start", prompt: "Cars24 FM original instrumental for a fresh morning start, light percussion, uplifting chords, calm momentum, no vocals" },
  { title: "Midnight Service Bay", prompt: "Cars24 FM original instrumental for a nocturnal garage mood, low-slung groove, airy textures, no vocals" },
  { title: "Expressway Pulse", prompt: "Cars24 FM original instrumental for dusk driving, steady electronic pulse, confident bassline, smooth synth glow, no vocals" },
  { title: "Builder's Detour", prompt: "Cars24 FM original instrumental for makers at work, crisp beat, focused low-end, understated melodic motion, no vocals" },
  { title: "Traffic Halo", prompt: "Cars24 FM original instrumental with floating pads, soft beat, cinematic city atmosphere, no vocals" },
  { title: "Workshop Dawn", prompt: "Cars24 FM original instrumental for early-morning garage energy, light groove, hopeful chords, clean texture, no vocals" },
  { title: "Late Shift Signals", prompt: "Cars24 FM original instrumental for late-night work, mellow drums, subtle movement, reflective synth tones, no vocals" },
  { title: "Headlights on Wet Asphalt", prompt: "Cars24 FM original instrumental for rainy-night driving, moody keys, patient beat, rich atmosphere, no vocals" },
];

function usage() {
  console.log(`Usage:
  node scripts/generate-eleven-music.mjs [--count N] [--duration-ms N] [--output-format fmt] [--add-to-playlist]

Examples:
  node scripts/generate-eleven-music.mjs --count 4 --duration-ms 60000 --add-to-playlist
  node scripts/generate-eleven-music.mjs --count 2

Requires:
  ELEVENLABS_API_KEY in the environment
`);
}

function parseArgs(argv) {
  const opts = {
    count: 4,
    durationMs: 60000,
    outputFormat: "mp3_44100_128",
    addToPlaylist: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") opts.count = Number(argv[++i] || opts.count);
    else if (arg === "--duration-ms") opts.durationMs = Number(argv[++i] || opts.durationMs);
    else if (arg === "--output-format") opts.outputFormat = argv[++i] || opts.outputFormat;
    else if (arg === "--add-to-playlist") opts.addToPlaylist = true;
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }
  if (!Number.isFinite(opts.count) || opts.count < 1) throw new Error("--count must be >= 1");
  if (!Number.isFinite(opts.durationMs) || opts.durationMs < 1000) throw new Error("--duration-ms must be >= 1000");
  return opts;
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}

function safeTitle(title) {
  return title.replace(/[^A-Za-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function generateOne({ title, prompt, durationMs, outputFormat, apiKey, index }) {
  const filename = `Cars24 FM Originals - ${stamp()} - ${String(index + 1).padStart(2, "0")} ${safeTitle(title)}.mp3`;
  const response = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${encodeURIComponent(outputFormat)}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationMs,
      force_instrumental: true,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${body}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(path.join(musicDir, filename), data);
  return {
    filename,
    title,
    prompt,
    durationMs,
    outputFormat,
    generatedAt: new Date().toISOString(),
    provider: "Cars24 FM Originals via ElevenLabs Music",
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  await fs.mkdir(musicDir, { recursive: true });
  const playlist = await readJson(playlistPath, []);
  const manifest = await readJson(manifestPath, { generatedWith: "Cars24 FM Originals via ElevenLabs Music", tracks: [] });

  const batch = Array.from({ length: opts.count }, (_, i) => DEFAULT_PROMPTS[i % DEFAULT_PROMPTS.length]);
  const generated = [];

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    console.log(`Generating ${i + 1}/${batch.length}: ${item.title}`);
    generated.push(await generateOne({
      ...item,
      durationMs: opts.durationMs,
      outputFormat: opts.outputFormat,
      apiKey,
      index: i,
    }));
  }

  manifest.tracks.push(...generated);
  await writeJson(manifestPath, manifest);

  if (opts.addToPlaylist) {
    const seen = new Set(playlist);
    for (const track of generated) {
      if (!seen.has(track.filename)) {
        playlist.push(track.filename);
        seen.add(track.filename);
      }
    }
    await writeJson(playlistPath, playlist);
  }

  console.log(`Generated ${generated.length} track(s).`);
  if (opts.addToPlaylist) {
    console.log(`Playlist now has ${playlist.length} tracks.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
