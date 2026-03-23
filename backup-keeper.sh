#!/usr/bin/env bash
set -euo pipefail

# Keeps only one latest Habit Rings backup in target folder.
# Source: Chrome downloads folder (latest matching file).

DOWNLOADS_DIR="${HOME}/Downloads"
TARGET_DIR="/home/abdul-rafay/Desktop/HabitRings"
TARGET_FILE="${TARGET_DIR}/habit-rings-backup-latest.json"

mkdir -p "${TARGET_DIR}"

# Pick newest file that starts with habit-rings-backup-latest and ends with .json
latest_source="$(
  ls -t "${DOWNLOADS_DIR}"/habit-rings-backup-latest*.json 2>/dev/null | head -n 1 || true
)"

if [[ -z "${latest_source}" ]]; then
  exit 0
fi

tmp_file="${TARGET_FILE}.tmp"
cp "${latest_source}" "${tmp_file}"
mv "${tmp_file}" "${TARGET_FILE}"

# Remove duplicate/old files in target directory, keep only canonical latest file.
for f in "${TARGET_DIR}"/habit-rings-backup-latest*.json; do
  [[ -e "${f}" ]] || continue
  if [[ "${f}" != "${TARGET_FILE}" ]]; then
    rm -f "${f}"
  fi
done

