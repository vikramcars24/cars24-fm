#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fmRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDarwinboxOutput =
  process.env.DARWINBOX_OUTPUT_DIR || path.join(process.env.HOME || "", "projects", "darwinbox", "output");
const outPath = path.join(fmRoot, "data", "celebrations.json");

function usage() {
  console.log(`Usage:
  node scripts/sync-celebrations-from-darwinbox.mjs [--date YYYY-MM-DD] [--darwinbox-output /path/to/output]

Reads latest CSPL + CAPL Darwinbox employee_directory.json dumps.
Writes data/celebrations.json for Cars24 FM.
`);
}

function parseArgs(argv) {
  const opts = { date: todayIst(), darwinboxOutput: defaultDarwinboxOutput };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") opts.date = argv[++i] || opts.date;
    else if (arg === "--darwinbox-output") opts.darwinboxOutput = argv[++i] || opts.darwinboxOutput;
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error("--date must look like YYYY-MM-DD");
  return opts;
}

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function md(dateString) {
  const raw = String(dateString || "").trim();
  if (!raw) return "";
  let match = raw.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
  if (match) {
    const months = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const mm = months[match[2].slice(0, 3).toLowerCase()];
    return mm ? `${mm}-${String(Number(match[1])).padStart(2, "0")}` : "";
  }
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[2]}-${match[3]}`;
  return "";
}

function year(dateString) {
  const raw = String(dateString || "").trim();
  const match = raw.match(/(\d{4})$/) || raw.match(/^(\d{4})-/);
  return match ? Number(match[1]) : 0;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function latestRunDirs(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const latest = new Map();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(cspl|capl)_(\d{8}_\d{6})$/);
    if (!match) continue;
    const dir = path.join(root, entry.name);
    try {
      await fs.access(path.join(dir, "employee_directory.json"));
    } catch {
      continue;
    }
    const existing = latest.get(match[1]);
    if (!existing || match[2] > existing.stamp) {
      latest.set(match[1], { stamp: match[2], dir });
    }
  }
  return [...latest.values()].map(item => item.dir);
}

function activeEmployees(payload) {
  return (payload.employee_data || [])
    .filter(emp => String(emp.employee_status || "").trim().toLowerCase() === "active")
    .filter(emp => !String(emp.date_of_exit || "").trim());
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targetMd = opts.date.slice(5);
  const targetYear = Number(opts.date.slice(0, 4));
  const dirs = await latestRunDirs(opts.darwinboxOutput);
  const celebrations = [];

  for (const dir of dirs) {
    const payload = await readJson(path.join(dir, "employee_directory.json"), {});
    for (const emp of activeEmployees(payload)) {
      const name = String(emp.full_name || "").trim();
      if (!name) continue;
      const email = String(emp.company_email_id || "").trim().toLowerCase();
      if (md(emp.date_of_birth) === targetMd) {
        celebrations.push({ date: opts.date, type: "birthday", name, email, source: "darwinbox" });
      }
      if (md(emp.date_of_joining) === targetMd) {
        const joinedYear = year(emp.date_of_joining);
        const years = joinedYear ? targetYear - joinedYear : 0;
        if (years >= 1) {
          celebrations.push({ date: opts.date, type: "anniversary", name, email, years, source: "darwinbox" });
        }
      }
    }
  }

  celebrations.sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(celebrations, null, 2) + "\n", "utf8");
  console.log(`Wrote ${celebrations.length} celebration(s) to ${outPath}`);
  if (!dirs.length) {
    console.log(`No readable Darwinbox employee_directory.json dumps found under ${opts.darwinboxOutput}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
