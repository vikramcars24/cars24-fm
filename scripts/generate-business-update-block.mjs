#!/usr/bin/env node

import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "music", "business-update");
const manifestPath = path.join(outDir, "today.json");
const IST = "Asia/Kolkata";

function usage() {
  console.log(`Usage:
  node scripts/generate-business-update-block.mjs --slack-link <url> [--days 3] [--trigger-time 11:00]
  node scripts/generate-business-update-block.mjs --clear

Reads:
  Slack permalink (using local Slack token)

Writes:
  music/business-update/today.json
  music/business-update/<startDate>-intro.mp3
  music/business-update/<startDate>-bed.mp3

Requires:
  ELEVENLABS_API_KEY
  local Slack user token under ~/.ai-ops/integrations/slack or env
`);
}

function parseArgs(argv) {
  const opts = {
    slackLink: "",
    days: 3,
    triggerTime: "11:00",
    startDate: "",
    clear: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--slack-link") opts.slackLink = argv[++i] || "";
    else if (arg === "--days") opts.days = Number(argv[++i] || opts.days);
    else if (arg === "--trigger-time") opts.triggerTime = argv[++i] || opts.triggerTime;
    else if (arg === "--start-date") opts.startDate = argv[++i] || "";
    else if (arg === "--clear") opts.clear = true;
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }
  if (!opts.clear && !opts.slackLink) throw new Error("--slack-link is required unless using --clear");
  if (!Number.isFinite(opts.days) || opts.days < 1) throw new Error("--days must be >= 1");
  if (!/^\d{2}:\d{2}$/.test(opts.triggerTime)) throw new Error("--trigger-time must look like HH:MM");
  if (opts.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(opts.startDate)) throw new Error("--start-date must look like YYYY-MM-DD");
  return opts;
}

async function writeJson(file, value) {
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function stripQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) return value.slice(1, -1);
  return value;
}

function getSlackToken() {
  const envToken = process.env.SLACK_TOKEN || process.env.SLACK_USER_TOKEN || process.env.SLACK_BOT_TOKEN;
  if (envToken) return envToken;
  const candidates = [
    path.join(process.env.HOME || "", ".ai-ops", "integrations", "slack", "token.json"),
    path.join(process.env.HOME || "", ".ai-ops", "integrations", "slack", "env"),
    path.join(process.env.HOME || "", ".slack-token"),
    path.join(process.env.HOME || "", ".slack-token.sh"),
  ];
  for (const candidate of candidates) {
    try {
      const raw = readFileSync(candidate, "utf8");
      if (candidate.endsWith(".json")) {
        const parsed = JSON.parse(raw);
        const token = parsed?.authed_user?.access_token || parsed?.access_token || parsed?.bot_token || "";
        if (token) return token;
        continue;
      }
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^(?:export\s+)?(SLACK_TOKEN|SLACK_USER_TOKEN|SLACK_BOT_TOKEN)\s*=\s*(.+)$/);
        if (match) return stripQuotes(match[2].trim());
      }
    } catch {}
  }
  return "";
}

async function slackApi(method, token, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const response = await fetch(`https://slack.com/api/${method}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const message = payload.error || `HTTP ${response.status}`;
    throw new Error(`Slack ${method} failed: ${message}`);
  }
  return payload;
}

function parseSlackLink(url) {
  const match = String(url).match(/\/archives\/([A-Z0-9]+)\/p(\d{16})/i);
  if (!match) throw new Error("Could not parse Slack permalink");
  return { channel: match[1], ts: `${match[2].slice(0, 10)}.${match[2].slice(10)}` };
}

function isoDateInTz(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function extractFirstSentence(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = clean.match(/.+?[.?!](?:\s|$)/);
  return (match ? match[0] : clean).trim();
}

function summarizeBusinessUpdate(message) {
  const text = String(message.text || "").replace(/<[^>]+>/g, "").replace(/\*/g, "").trim();
  const file = (message.files || [])[0] || {};
  const aiSummary = String(file.ai_summary?.content || "").trim();
  const title = String(file.title || file.name || "Global Pulse").replace(/\.pdf$/i, "");
  const standout = text.match(/stands out clearly:\s*([^.\n!?]+[.!?]?)/i);
  const brighter = text.match(/(The future looks even brighter from here\.)/i);
  const headline = (standout && standout[1] ? standout[1].trim() : "") ||
    (brighter && brighter[1] ? brighter[1].trim() : "") ||
    extractFirstSentence(text) ||
    `This month's ${title} is in.`;
  const summary = (aiSummary || text)
    .replace(/\s+/g, " ")
    .replace(/₹/g, "rupees ")
    .replace(/\bCr\b/g, " crore")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { title, headline, summary };
}

function ttsScript({ title, headline, summary }) {
  const clipped = summary.split(". ").slice(0, 4).join(". ").trim();
  return `Cars24 FM business update. ${headline} From ${title}: ${clipped}`;
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
        stability: 0.42,
        similarity_boost: 0.8,
        style: 0.25,
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
      music_length_ms: 28000,
      force_instrumental: true,
    }),
  });
  if (!res.ok) throw new Error(`music failed: ${res.status} ${await res.text()}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function clearManifest() {
  await fs.mkdir(outDir, { recursive: true });
  await writeJson(manifestPath, {
    active: false,
    startDate: "",
    endDate: "",
    triggerTime: "11:00",
    title: "",
    headline: "",
    summary: "",
    sourceSlackUrl: "",
    audio: { intro: "", bed: "" },
    generatedAt: new Date().toISOString(),
  });
  console.log("Cleared business update manifest.");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.clear) return clearManifest();

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const slackToken = getSlackToken();
  if (!slackToken) throw new Error("Slack token is not set");

  const { channel, ts } = parseSlackLink(opts.slackLink);
  const payload = await slackApi("conversations.history", slackToken, {
    channel,
    oldest: ts,
    latest: ts,
    inclusive: true,
    limit: 1,
  });
  const message = (payload.messages || [])[0];
  if (!message) throw new Error("Slack message not found");

  const { title, headline, summary } = summarizeBusinessUpdate(message);
  const sourceDate = isoDateInTz(new Date(Number(ts.split(".")[0]) * 1000), IST);
  const startDate = opts.startDate || isoDateInTz(new Date(), IST);
  const endDate = addDays(startDate, opts.days - 1);
  const introFile = `${startDate}-intro.mp3`;
  const bedFile = `${startDate}-bed.mp3`;

  await fs.mkdir(outDir, { recursive: true });
  const voiceId = await resolveVoiceId(apiKey, "Liam");
  if (!voiceId) throw new Error("No ElevenLabs voice available");

  await genTts(apiKey, voiceId, ttsScript({ title, headline, summary }), path.join(outDir, introFile));
  await genBed(apiKey, "short business radio bulletin sting for Cars24 FM, confident, modern, optimistic, no vocals", path.join(outDir, bedFile));

  await writeJson(manifestPath, {
    active: true,
    startDate,
    endDate,
    triggerTime: opts.triggerTime,
    title,
    headline,
    summary,
    sourceSlackUrl: opts.slackLink,
    sourceChannel: channel,
    sourceTs: ts,
    sourceDate,
    audio: {
      intro: `business-update/${introFile}`,
      bed: `business-update/${bedFile}`,
    },
    generatedAt: new Date().toISOString(),
  });

  console.log(`Business update block generated for ${title} (${startDate} to ${endDate}).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
