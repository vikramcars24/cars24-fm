#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INPUT_DIR="${1:-$ROOT/music}"
OUTPUT_DIR="${2:-$ROOT/build/mastered-audio}"
REPORT="$OUTPUT_DIR/mastering-report.tsv"
mkdir -p "$OUTPUT_DIR"
printf 'source\toutput\tcodec\tlufs_target\ttrue_peak\n' > "$REPORT"

while IFS= read -r -d '' src; do
  rel="${src#$INPUT_DIR/}"
  out="$OUTPUT_DIR/${rel%.*}.m4a"
  mkdir -p "$(dirname "$out")"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -af "loudnorm=I=-14:TP=-1:LRA=9,alimiter=limit=0.891251" \
    -ar 48000 -ac 2 -c:a aac -b:a 256k "$out"
  printf '%s\t%s\taac\t-14\t-1\n' "$src" "$out" >> "$REPORT"
done < <(find "$INPUT_DIR" -type f \( -iname '*.mp3' -o -iname '*.wav' -o -iname '*.flac' -o -iname '*.m4a' \) -print0)

echo "Mastered catalogue: $OUTPUT_DIR"
echo "Report: $REPORT"
