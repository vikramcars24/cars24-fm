#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OBS_APP="/Applications/OBS.app"
command -v brew >/dev/null || { echo 'Homebrew is required.' >&2; exit 1; }
[[ -d "$OBS_APP" ]] || brew install --cask obs

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/cars24-fm"
PLIST="$HOME/Library/LaunchAgents/com.cars24.fm-stream.plist"
sed "s|__ROOT__|$ROOT|g" "$ROOT/config/com.cars24.fm-stream.plist.template" > "$PLIST"
launchctl bootout "gui/$(id -u)/com.cars24.fm-stream" 2>/dev/null || true
if pgrep -f '/Applications/OBS.app/Contents/MacOS/OBS' >/dev/null; then
  echo 'OBS is already running; the service is installed and will activate at the next login.'
else
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl enable "gui/$(id -u)/com.cars24.fm-stream"
fi

echo 'Office runtime installed. Configure the YouTube key once in OBS Settings → Stream.'
echo 'The Mac will stay awake and OBS will relaunch at login.'
