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
    if (kbps >= minimumKbps) retained.push(name);
    else removed.push({ name, kbps });
  }
  await fs.writeFile(playlistPath, JSON.stringify(retained, null, 2) + "\n");
  await fs.mkdir(path.join(root, "build"), { recursive: true });
  await fs.writeFile(path.join(root, "build", "quality-prune-report.json"), JSON.stringify({ minimumKbps, retained: retained.length, removed }, null, 2) + "\n");
  console.log(`Retained ${retained.length} tracks; removed ${removed.length} playlist entries below ${minimumKbps} kbps.`);
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
