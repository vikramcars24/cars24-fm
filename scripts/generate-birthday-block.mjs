#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const celebrationsPath = path.join(root, "data", "celebrations.json");
const birthdaysPath = path.join(root, "data", "birthdays.json");
const outDir = path.join(root, "music", "birthday");
const manifestPath = path.join(outDir, "today.json");
const IST = "Asia/Kolkata";

function usage() {
  console.log(`Usage:
  node scripts/generate-birthday-block.mjs [--date YYYY-MM-DD]

Reads:
  data/celebrations.json
  data/birthdays.json (legacy fallback)

Writes:
  music/birthday/today.json
  music/birthday/<date>-intro.mp3
  music/birthday/<date>-bed.mp3

Requires:
  ELEVENLABS_API_KEY
`);
}

function parseArgs(argv) {
  const opts = { date: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") opts.date = argv[++i] || "";
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }
  return opts;
}

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch { return fallback; }
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

async function resolveVoiceId(apiKey, preferred = "Liam") {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey }
  });
  if (!res.ok) throw new Error(`voices lookup failed: ${res.status} ${await res.text()}`);
  const payload = await res.json();
  const voices = payload.voices || [];
  const exact = voices.find(v => (v.name || "").toLowerCase() === preferred.toLowerCase());
  return (exact || voices[0] || {}).voice_id || "";
}

function normalizeCelebrations(raw, date) {
  return raw
    .filter(item => item && item.date === date && item.name)
    .map(item => {
      const type = String(item.type || "birthday").toLowerCase();
      const years = Number(item.years || item.anniversaryYears || 0);
      return {
        date,
        type: type === "anniversary" ? "anniversary" : "birthday",
        name: String(item.name || "").trim(),
        years: Number.isFinite(years) && years > 0 ? Math.floor(years) : 0,
      };
    })
    .filter(item => item.name);
}

async function readCelebrations(date) {
  const next = await readJson(celebrationsPath, null);
  if (Array.isArray(next)) return normalizeCelebrations(next, date);
  const legacy = await readJson(birthdaysPath, []);
  return normalizeCelebrations(legacy.map(item => ({ ...item, type: "birthday" })), date);
}

function ordinal(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function celebrationIntroText(celebrations) {
  const birthdays = celebrations.filter(item => item.type === "birthday").map(item => item.name);
  const anniversaries = celebrations
    .filter(item => item.type === "anniversary")
    .map(item => `${item.name} on their ${ordinal(item.years || 1)} Cars24 anniversary`);
  const parts = [];
  if (birthdays.length) parts.push(`we are celebrating birthdays for ${joinNames(birthdays)}`);
  if (anniversaries.length) parts.push(`we are cheering ${joinNames(anniversaries)}`);
  return `Cars24 FM celebration block. Today ${joinNames(parts)}. Wishing you momentum, joy, and a brilliant year ahead from everyone at Cars24.`;
}

async function genTts(apiKey, voiceId, text, outFile) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      }
    }),
  });
  if (!res.ok) throw new Error(`tts failed: ${res.status} ${await res.text()}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function genBed(apiKey, prompt, outFile) {
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: 30000,
      force_instrumental: true,
    }),
  });
  if (!res.ok) throw new Error(`music failed: ${res.status} ${await res.text()}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const date = opts.date || todayIst();
  const todays = await readCelebrations(date);
  await fs.mkdir(outDir, { recursive: true });

  if (!todays.length) {
    await writeJson(manifestPath, {
      date,
      timezone: IST,
      triggerTime: "10:00",
      celebrations: [],
      audio: { intro: "", bed: "" },
      generatedAt: new Date().toISOString(),
    });
    console.log(`No celebrations found for ${date}. Wrote empty manifest.`);
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const voiceId = await resolveVoiceId(apiKey, "Liam");
  if (!voiceId) throw new Error("No ElevenLabs voice available");

  const introFile = `${date}-intro.mp3`;
  const bedFile = `${date}-bed.mp3`;
  const introText = celebrationIntroText(todays);
  const bedPrompt = `short celebratory instrumental radio sting for Cars24 FM, upbeat but tasteful, modern, warm, no vocals`;

  await genTts(apiKey, voiceId, introText, path.join(outDir, introFile));
  await genBed(apiKey, bedPrompt, path.join(outDir, bedFile));

  await writeJson(manifestPath, {
    date,
    timezone: IST,
    triggerTime: "10:00",
    celebrations: todays,
    audio: {
      intro: `birthday/${introFile}`,
      bed: `birthday/${bedFile}`,
    },
    generatedAt: new Date().toISOString(),
  });

  console.log(`Celebration block generated for ${date}: ${todays.map(item => item.name).join(", ")}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
