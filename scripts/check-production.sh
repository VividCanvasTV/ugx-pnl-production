#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
zip_path="$repo_root/deployment/ugxpnl-production-live.zip"

echo "Checking production zip integrity..."
unzip -t "$zip_path" >/dev/null

echo "Checking production zip excludes setup and credential files..."
if unzip -Z1 "$zip_path" | grep -E '(^|/)(seed_admin|setup_check|setup_config|db_config|schema\.sql|README|\.md$|\.txt$|example|highlevel-mcp-handoff)' >/dev/null; then
  echo "Forbidden setup, docs, example, schema, or credential file found in production zip." >&2
  exit 1
fi

echo "Checking tracked repo excludes live server-only files..."
if git -C "$repo_root" ls-files | grep -E '(^|/)(db_config\.php|ghl_config\.php|setup_config|seed_admin|setup_check|\.env$)|^public_html/config/config\.php$' >/dev/null; then
  echo "Forbidden server-only or setup file is tracked." >&2
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  echo "Checking JavaScript syntax..."
  for file in "$repo_root"/public_html/static/js/*.js; do
    node --check "$file" >/dev/null
  done
else
  echo "Node.js not found; skipping JavaScript syntax check."
fi

echo "Production checks passed."

