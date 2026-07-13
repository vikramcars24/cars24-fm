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
const minimumKbps = Number(process.env.MINIMUM_KBPS || 128);
const requireLosslessSource = process.env.REQUIRE_LOSSLESS_SOURCE !== "0";

async function bitrateKbps(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=bit_rate", "-of", "json", file,
  ]);
  return Math.round((Number(JSON.parse(stdout).format?.bit_rate) || 0) / 1000);
}

async function main() {
  const playlist = JSON.parse(await fs.readFile(playlistPath, "utf8"));
  const retained = [];
  const removed = [];
  for (const name of playlist) {
    const file = path.join(musicDir, name);
    const kbps = await bitrateKbps(file);
    const isLosslessSourcedMaster = /\.m4a$/i.test(name);
    if (kbps < minimumKbps) removed.push({ name, kbps, reason: "below-minimum-bitrate" });
    else if (requireLosslessSource && !isLosslessSourcedMaster) removed.push({ name, kbps, reason: "lossy-only-source" });
    else retained.push(name);
  }
  await fs.writeFile(playlistPath, JSON.stringify(retained, null, 2) + "\n");
  await fs.mkdir(path.join(root, "build"), { recursive: true });
  await fs.writeFile(path.join(root, "build", "quality-prune-report.json"), JSON.stringify({ minimumKbps, requireLosslessSource, retained: retained.length, removed }, null, 2) + "\n");
  console.log(`Retained ${retained.length} lossless-sourced masters; removed ${removed.length} lower-quality playlist entries.`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
